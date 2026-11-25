import { spawn } from "node:child_process";
import { once } from "node:events";
import { cpSync, createWriteStream, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { realpath } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { chromium } from "playwright";
import { readRegularFile, writeJSON } from "./artifact.mjs";
import { chromiumOptions, monacoAssets } from "./browser.mjs";
import { experiment, hash, require, startApp, stopProcess } from "./reset.mjs";

const templates = join(experiment, "templates");
const node = realpathSync(process.execPath);
const sandbox = "/usr/bin/sandbox-exec";
const fileRule = (paths) => paths.map((path) => `(subpath ${JSON.stringify(path)})`).join(" ");
const networkRule = (operation, direction, address) => `(allow network-${operation} (${direction} ip "${address}"))`;
const address = (url) => `localhost:${new URL(url).port}`;

export function workerProfile({ read, write, outbound, server = false }) {
  return [
    "(version 1)",
    "(allow default)",
    "(deny file-read-data file-write*)",
    '(allow file-read-data (literal "/"))',
    `(allow file-read-data ${fileRule(["/System", "/Library/Apple", "/usr/lib", "/usr/share", "/bin", "/dev", "/private/etc/hosts", node, ...read, ...write])})`,
    `(allow file-write* ${fileRule(["/dev/null", ...write])})`,
    "(deny signal)",
    "(allow signal (target same-sandbox))",
    "(deny network*)",
    networkRule("outbound", "remote", outbound),
    ...(server
      ? [networkRule("bind", "local", "localhost:*"), networkRule("inbound", "local", "localhost:*")]
      : ["(deny process-exec)", `(allow process-exec (literal ${JSON.stringify(node)}))`]),
  ].join("\n");
}

export function stageRuntime(trial) {
  const runtime = join(trial, "runtime");
  const deps = join(runtime, "node_modules");
  for (const name of ["@playwright/test", "playwright", "playwright-core"]) {
    const from = dirname(require.resolve(`${name}/package.json`));
    const to = join(deps, name);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true });
  }
  const monacoRoot = join(runtime, "monaco");
  cpSync(monacoAssets.monacoRoot, monacoRoot, { recursive: true });
  const browserEntry = join(runtime, "browser-server.mjs");
  cpSync(join(import.meta.dirname, "browser-server.mjs"), browserEntry);
  return { runtime, deps, browserEntry, monacoRoot };
}

export function workerEnv(temp) {
  return { PATH: `${dirname(node)}:/usr/bin:/bin`, HOME: temp, TMPDIR: temp, CI: "1" };
}

export async function openBrowserServer({ scratch, staged, baseURL, logPath }) {
  const privateRoot = await realpath(mkdtempSync(join(scratch, "chrome-")));
  const temp = join(privateRoot, "tmp");
  mkdirSync(temp);
  let chromiumDir = dirname(chromium.executablePath());
  while (!/^chromium-\d+$/.test(basename(chromiumDir))) {
    const parent = dirname(chromiumDir);
    if (parent === chromiumDir) throw new Error("Cannot locate the Playwright browser cache.");
    chromiumDir = parent;
  }
  const browsersPath = dirname(chromiumDir);
  const headlessDir = join(browsersPath, basename(chromiumDir).replace("chromium-", "chromium_headless_shell-"));
  const profile = workerProfile({
    read: [staged.runtime, headlessDir, "/Library/Preferences", "/private/etc", "/System/Volumes/Preboot/Cryptexes/OS"],
    write: [temp],
    outbound: address(baseURL), server: true,
  });
  const env = {
    ...workerEnv(temp),
    PLAYWRIGHT_BROWSERS_PATH: browsersPath,
    JS2GO_CHROMIUM: JSON.stringify(chromiumOptions),
  };
  const stderr = createWriteStream(logPath, { flags: "a" });
  const browser = spawn(sandbox, ["-p", profile, node, staged.browserEntry], {
    cwd: privateRoot, env, detached: true, stdio: ["pipe", "pipe", "pipe"],
  });
  browser.stderr.pipe(stderr, { end: false });
  const lines = createInterface({ input: browser.stdout });
  async function close() {
    browser.stdin.end();
    if (browser.exitCode === null && browser.signalCode === null) {
      const done = once(browser, "exit");
      const force = setTimeout(() => stopProcess(browser, true), 3000);
      try {
        await done;
      } finally {
        clearTimeout(force);
      }
    }
    lines.close();
    await new Promise((resolve) => stderr.end(resolve));
    rmSync(privateRoot, { recursive: true, force: true });
  }
  try {
    const endpoint = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Sandboxed Chromium startup timed out.")), 20000);
      lines.once("line", (line) => {
        clearTimeout(timer);
        if (line.startsWith("ws://127.0.0.1:")) resolve(line);
        else reject(new Error("Invalid browser endpoint."));
      });
      browser.once("error", (error) => { clearTimeout(timer); reject(error); });
      browser.once("exit", (code, signal) => { clearTimeout(timer); reject(new Error(`Sandboxed Chromium exited (${code ?? signal}).`)); });
    });
    return { endpoint, close };
  } catch (error) {
    await close();
    throw error;
  }
}

export async function execute({ scratch, staged, dir, clean, candidate, settings, deadline = Infinity, signal }) {
  signal?.throwIfAborted();
  mkdirSync(dir, { recursive: true });
  const work = await realpath(mkdtempSync(join(staged.runtime, "test-")));
  const temp = join(work, "tmp");
  const output = join(work, "output");
  mkdirSync(temp);
  mkdirSync(output);
  for (const file of ["playwright.config.ts", "test-kit.ts", "browser-routes.mjs"]) {
    cpSync(join(templates, file), join(work, file));
  }
  cpSync(candidate.path, join(work, "calc.spec.ts"));
  const copied = readFileSync(join(work, "calc.spec.ts"));
  if (hash(copied) !== candidate.sha256) throw new Error("Candidate hash changed before replay.");
  const stdout = join(dir, "playwright.log");
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const result = {
    schemaVersion: 1, candidateSha256: candidate.sha256, startedAt,
    exitCode: null, signal: null, upstream: [], status: "infrastructure_failure",
  };
  let app, browser;
  try {
    app = await startApp({ ...clean, runDir: dir, proxyAuth: true });
    browser = await openBrowserServer({ scratch, staged, baseURL: app.baseURL, logPath: join(dir, "chromium.log") });
    const config = workerProfile({
      read: [work, staged.deps, staged.monacoRoot],
      write: [temp, output],
      outbound: address(browser.endpoint),
    });
    const env = {
      ...workerEnv(temp),
      JS2GO_BROWSER: browser.endpoint,
      JS2GO_BASE_URL: app.baseURL,
      JS2GO_PLAYWRIGHT: JSON.stringify(settings),
      JS2GO_MONACO_URL: monacoAssets.monacoURL,
      JS2GO_MONACO_ROOT: staged.monacoRoot,
    };
    signal?.throwIfAborted();
    if (deadline <= Date.now()) throw new Error("The session deadline elapsed during test startup.");
    const process = spawn(sandbox, ["-p", config, node, join(staged.deps, "@playwright/test/cli.js"),
      "test", "--config", "playwright.config.ts"], {
      cwd: work, env, detached: true, stdio: ["ignore", "pipe", "pipe"],
    });
    const stream = createWriteStream(stdout);
    process.stdout.pipe(stream, { end: false });
    process.stderr.pipe(stream, { end: false });
    const stop = () => {
      stopProcess(process, true).catch((error) => { result.error = error.message; });
    };
    signal?.addEventListener("abort", stop, { once: true });
    const timer = setTimeout(() => {
      result.timedOut = true;
      stop();
    }, Math.max(1, Math.min(settings.testTimeoutMs + 30000, deadline - Date.now())));
    try {
      [result.exitCode, result.signal] = await once(process, "close");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", stop);
      await new Promise((resolve) => stream.end(resolve));
    }

    const report = join(output, "playwright.json");
    if (existsSync(report)) {
      const data = JSON.parse(readRegularFile(report, 8 * 1024 * 1024));
      result.stats = data.stats;
      result.status = result.exitCode === 0 && data.stats.expected === 1 &&
        data.stats.unexpected === 0 && data.stats.skipped === 0 ? "passed" : "failed";
    } else if (result.timedOut) {
      result.status = "timed_out";
    }
    result.upstream = app.upstream.requests.map(({ chunks, ...entry }) => entry);
  } catch (error) {
    result.error = error.message;
  } finally {
    if (signal?.aborted) result.status = "interrupted";
    await browser?.close();
    await app?.shutdown();
    cpSync(output, dir, {
      recursive: true,
      filter: (file) => {
        const stat = lstatSync(file);
        return stat.isDirectory() || (stat.isFile() && stat.nlink === 1);
      },
    });
    rmSync(work, { recursive: true, force: true });
    result.durationMs = Math.round(performance.now() - start);
    result.finishedAt = new Date().toISOString();
    writeJSON(join(dir, "execution.json"), result);
  }
  const agentOutput = existsSync(stdout) ? readFileSync(stdout, "utf8").replaceAll(staged.runtime, "<runner>") : "";
  return { ...result, agentOutput: agentOutput.trim().slice(-12000) || `Test execution: ${result.status}` };
}

export async function probeWorkerIsolation(browser, privateFile) {
  const connection = await chromium.connect(browser.endpoint);
  try {
    const page = await connection.newPage();
    const url = new URL(`file://${privateFile}`).href;
    let refused = false;
    try {
      await page.goto(url, { timeout: 3000 });
      refused = !(await page.locator("body").innerText()).includes("benchmark-private-canary");
    } catch (error) {
      if (!/ERR_ACCESS_DENIED|ERR_FILE_NOT_FOUND/i.test(error.message)) throw error;
      refused = true;
    }
    if (!refused) throw new Error("Chromium can read outside its trial roots.");
  } finally {
    await connection.close();
  }
}
