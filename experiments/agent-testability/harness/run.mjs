import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import {
  appendFileSync, cpSync, createWriteStream, mkdirSync, mkdtempSync, symlinkSync,
  readFileSync, readdirSync, realpathSync, rmSync, writeFileSync,
} from "node:fs";
import { homedir, release, tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { readRegularFile, writeJSON } from "./artifact.mjs";
import { discover } from "./browser.mjs";
import { captureRollout } from "./codex-events.mjs";
import { execute, openBrowserServer, probeWorkerIsolation, stageRuntime } from "./execution.mjs";
import { gradeTrial } from "./grade.mjs";
import { mutate } from "./mutations.mjs";
import { experiment, hash, loadBaseline, readJSON, repository, require, startApp, stopProcess } from "./reset.mjs";

const templates = join(experiment, "templates");
const { positionals: [series], values } = parseArgs({
  allowPositionals: true,
  options: {
    revision: { type: "string", default: "R0" },
    trials: { type: "string", default: "1" },
    mode: { type: "string", default: "recorded" },
    phase: { type: "string", default: "pilot" },
  },
});
const { revision, mode, phase } = values;
const trials = Number(values.trials);
if (!["smoke", "benchmark"].includes(series) || !["pilot", "main"].includes(phase) || mode !== "recorded" ||
    !Number.isSafeInteger(trials) || trials < 1 || (series === "smoke" && trials !== 1)) {
  throw new Error("Use agent:smoke -- --revision R0 or agent:benchmark -- --revision R0 --phase pilot|main --trials N --mode recorded.");
}
const runKind = series === "smoke" ? "smoke" : phase;
if (series === "benchmark" && process.env.JS2GO_APPROVED_RUN !== `${revision}/${phase}/${trials}`) {
  throw new Error(`Pilot/main requires explicit budget authorization for ${revision}/${phase}/${trials}.`);
}

const configPath = join(experiment, "configs/experiment.json");
const settings = readJSON(configPath);
const codex = realpathSync(process.env.JS2GO_CODEX ?? execFileSync("/usr/bin/which", ["codex"], { encoding: "utf8" }).trim());
const codexVersion = execFileSync(codex, ["--version"], { encoding: "utf8" }).trim();
const npmVersion = process.env.npm_config_user_agent?.match(/npm\/(\S+)/)?.[1] ?? null;
const chromiumInfo = readJSON(join(dirname(require.resolve("playwright-core/package.json")), "browsers.json")).browsers
  .find(({ name }) => name === "chromium-headless-shell");
const environment = {
  node: process.version, npm: npmVersion, playwright: require("@playwright/test/package.json").version,
  chromium: chromiumInfo, codex: codexVersion,
  os: { platform: process.platform, release: release(), arch: process.arch },
  lockSha256: hash(readFileSync(join(repository, "package-lock.json"))),
};
if (process.platform !== "darwin" || process.version !== settings.nodeVersion || npmVersion !== settings.npmVersion ||
    codexVersion !== settings.codexVersion || environment.playwright !== settings.playwrightVersion ||
    chromiumInfo.revision !== settings.chromiumRevision) {
  throw new Error("The host or tool versions differ from the experiment pin.");
}
realpathSync(chromium.executablePath());
const authPath = process.env.JS2GO_CODEX_AUTH ?? join(homedir(), ".codex/auth.json");
realpathSync(authPath);
const clean = loadBaseline(revision);
const brief = readFileSync(join(experiment, "briefs/calc-01.md"), "utf8").trimEnd();
const instructions = readFileSync(join(templates, "instructions.md"), "utf8").trimEnd();
const harnessEntries = ["harness", "templates"].flatMap((folder) => readdirSync(join(experiment, folder))
  .sort().map((name) => [`${folder}/${name}`, hash(readFileSync(join(experiment, folder, name)))]));
const mutationFixtures = Object.fromEntries(["add", "multiply"].map((kind) => [kind, mutate(clean.fixture, kind)]));
const experimentId = hash(JSON.stringify([hash(readFileSync(configPath)), hash(instructions + "\n\n" + brief), environment, harnessEntries])).slice(0, 16);
const results = join(experiment, "artifacts", experimentId, revision);
mkdirSync(results, { recursive: true, mode: 0o700 });
const interrupt = new AbortController();
for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  process.once(signal, () => {
    process.exitCode = code;
    interrupt.abort(new Error(`Runner interrupted by ${signal}.`));
  });
}

function copyCandidate(workspace, runDir, file) {
  const bytes = readRegularFile(join(workspace, "calc.spec.ts"), 128 * 1024);
  const path = join(runDir, ".candidates", file);
  writeFileSync(path, bytes, { flag: "wx", mode: 0o400 });
  return { path, sha256: hash(bytes), bytes: bytes.length };
}

function configureCodex(workspace, privateDir, bridge) {
  const config = [
    'default_permissions = "benchmark"',
    'approval_policy = "never"',
    'web_search = "disabled"',
    'cli_auth_credentials_store = "file"',
    'allow_login_shell = false',
    '[features]',
    'apps = false',
    'plugins = false',
    'hooks = false',
    'shell_snapshot = false',
    'skill_search = false',
    '[shell_environment_policy]',
    'inherit = "core"',
    'exclude = ["*PROXY*", "*proxy*", "*TOKEN*", "*KEY*", "CODEX_HOME"]',
    '[permissions.benchmark.filesystem]',
    '":root" = "deny"',
    '":minimal" = "read"',
    '":workspace_roots" = "write"',
    `${JSON.stringify(bridge)} = "write"`,
    `${JSON.stringify(dirname(process.execPath))} = "read"`,
    '"/System/Library/OpenSSL" = "read"',
    '[permissions.benchmark.network]',
    'enabled = false',
  ].join("\n");
  writeFileSync(join(privateDir, "config.toml"), config, { mode: 0o600 });
  const proxyEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    /^(?:https?_proxy|all_proxy|no_proxy)$/i.test(key)));
  const temp = join(workspace, "tmp");
  mkdirSync(temp);
  return {
    ...proxyEnv,
    PATH: `${dirname(process.execPath)}:/usr/bin:/bin:/usr/sbin:/sbin`,
    HOME: workspace, CODEX_HOME: privateDir, TMPDIR: temp, SHELL: "/bin/zsh", TERM: "dumb", CI: "1",
  };
}

async function preflight({ env, workspace, privateDir, runDir, browser, baseURL }) {
  const canary = join(privateDir, "isolation-canary");
  writeFileSync(canary, "benchmark-private-canary", { mode: 0o600 });
  const options = { cwd: workspace, env, encoding: "utf8", timeout: 10000 };
  execFileSync(codex, ["sandbox", "-P", "benchmark", "-C", workspace, "--", process.execPath, "-e", `
    const fs = require("node:fs");
    for (const path of process.argv.slice(1, -1)) {
      try {
        fs.readFileSync(path);
        process.exit(7);
      } catch (error) {
        if (!["EACCES", "EPERM"].includes(error.code)) throw error;
      }
    }
    fs.writeFileSync("isolation-write", "ok");
    fetch(process.argv.at(-1), { signal: AbortSignal.timeout(2000) })
      .then(() => process.exitCode = 8, () => {});
  `, canary, join(repository, "package.json"), join(experiment, "fixtures/R0.json.gz"), baseURL], options);
  rmSync(join(workspace, "isolation-write"));
  await probeWorkerIsolation(browser, canary);
  writeJSON(join(runDir, "isolation.json"), {
    codexPrivateReadDenied: true, codexRepoReadDenied: true, codexFixtureReadDenied: true,
    codexWorkspaceWriteAllowed: true, codexDirectAppDenied: true, browserPrivateFileDenied: true,
  });
}

async function persistStream(stream, dest, onLine) {
  const file = createWriteStream(dest, { mode: 0o600 });
  const finished = once(file, "finish");
  stream.pipe(file);
  if (onLine) {
    const lines = createInterface({ input: stream });
    let number = 0;
    for await (const line of lines) onLine(line, ++number);
  }
  await finished;
}

async function runTrial(order) {
  const runDir = mkdtempSync(join(results, `${runKind}-`));
  const trialId = runDir.split("/").at(-1);
  console.log(`Private ${runKind} evidence: ${runDir}`);
  mkdirSync(join(runDir, ".candidates"));
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), "js2go-benchmark-")));
  const workspace = join(scratch, "workspace");
  const privateDir = join(scratch, "codex");
  mkdirSync(workspace);
  mkdirSync(privateDir, { mode: 0o700 });
  const bridge = join(scratch, "bridge");
  mkdirSync(bridge);
  symlinkSync(bridge, join(workspace, "bridge"), "dir");
  const events = join(runDir, "tool-events.jsonl");
  const emit = (type, detail = {}) => appendFileSync(events, JSON.stringify({
    timestamp: new Date().toISOString(), trialId, type, attemptId: null, ...detail,
  }) + "\n", { mode: 0o600 });
  const runState = join(runDir, "run.json");
  const run = {
    schemaVersion: 1, trialId, order, experimentId, series: runKind, revision, mode,
    sourceSha: clean.baseline.sourceSha, fixtureSha256: clean.baseline.fixtureSha256,
    fixtureSource: clean.fixture.source, configSha256: hash(readFileSync(configPath)),
    promptTemplateSha256: hash(instructions + "\n\n" + brief), harnessSha256: hash(JSON.stringify(harnessEntries)),
    environment, environmentSha256: hash(JSON.stringify(environment)),
    budgets: settings, startedAt: new Date().toISOString(), outcome: "running", agent: null, launches: [],
    candidates: { first: null, final: null }, replays: {}, mutations: {},
  };
  const save = () => writeJSON(runState, run);
  save();
  let app, discoveryServer, discovery, agent, agentDone = false, staged, first, final;
  try {
    const env = configureCodex(workspace, privateDir, bridge);
    staged = stageRuntime(scratch);
    for (const file of ["calc.spec.ts", "client.mjs", "test-kit.ts", "browser-routes.mjs"]) {
      cpSync(join(templates, file), join(workspace, file));
    }
    writeFileSync(join(workspace, "browser"), '#!/bin/sh\ncd "$(dirname "$0")" || exit 1\nexec node client.mjs browser "$@"\n', { mode: 0o755 });
    writeFileSync(join(workspace, "run-test"), '#!/bin/sh\ncd "$(dirname "$0")" || exit 1\nexec node client.mjs test\n', { mode: 0o755 });
    app = await startApp({ ...clean, runDir: join(runDir, "discovery"), proxyAuth: true });
    discoveryServer = await openBrowserServer({ scratch, staged, baseURL: app.baseURL, logPath: join(runDir, "discovery/chromium.log") });
    await preflight({ env, workspace, privateDir, runDir, browser: discoveryServer, baseURL: app.baseURL });
    discovery = await discover(app.baseURL, settings, discoveryServer.endpoint);
    interrupt.signal.throwIfAborted();
    cpSync(authPath, join(privateDir, "auth.json"));
    const prompt = instructions.replace("{{URL}}", app.baseURL) + "\n\n" + brief;
    run.promptSha256 = hash(prompt);
    writeFileSync(join(runDir, "prompt.txt"), prompt + "\n", { mode: 0o600 });
    const agentStart = performance.now();
    const deadline = Date.now() + settings.wallMs;
    run.agent = { startedAt: new Date().toISOString(), exitCode: null, signal: null, timedOut: false };
    save();
    agent = spawn(codex, ["exec", "--json", "--strict-config", "--color", "never", "--skip-git-repo-check",
      "--ignore-rules", "-C", workspace, "-m", settings.model, "-c", `model_reasoning_effort="${settings.effort}"`, "-"], {
      cwd: workspace, env, detached: true, stdio: ["pipe", "pipe", "pipe"],
    });
    const complete = once(agent, "close").then(([exitCode, signal]) => {
      agentDone = true;
      Object.assign(run.agent, { exitCode, signal, wallMs: Math.round(performance.now() - agentStart), finishedAt: new Date().toISOString() });
    });
    complete.catch(() => { agentDone = true; });
    const logs = Promise.all([
      persistStream(agent.stdout, join(runDir, "codex.jsonl"), (line, number) => {
        let type;
        try { type = JSON.parse(line).type; } catch { type = "invalid_jsonl"; }
        emit("codex", { codexType: type, raw: `codex.jsonl:${number}` });
      }),
      persistStream(agent.stderr, join(runDir, "codex.stderr.log")),
    ]);
    logs.catch(() => {});
    agent.stdin.on("error", (error) => { emit("prompt_write_error", { message: error.message }); });
    agent.stdin.end(prompt);
    const stopAgent = () => stopProcess(agent, true).catch((error) => emit("shutdown_error", { message: error.message }));
    interrupt.signal.addEventListener("abort", stopAgent, { once: true });
    const timeout = setTimeout(() => {
      run.agent.timedOut = true;
      stopAgent();
    }, settings.wallMs);
    const seen = new Set();
    const root = relative(runDir, join(runDir, ".candidates"));
    const summarize = ({ path, ...data }) => ({ ...data, file: join(root, path.split("/").at(-1)) });

    try {
      while (!agentDone) {
        for (const file of readdirSync(bridge)) {
          if (agentDone) break;
          if (!/^[0-9a-f-]{36}\.request$/.test(file) || seen.has(file)) continue;
          seen.add(file);
          let answer;
          try {
            const command = JSON.parse(readRegularFile(join(bridge, file), 32768));
            if (command.kind === "browser" && typeof command.command === "string" &&
                Array.isArray(command.args) && command.args.every((arg) => typeof arg === "string")) {
              try {
                answer = await discovery.act(command.command, command.args);
                let screenshot;
                if (answer.image) {
                  screenshot = `discovery/${file.replace(/\.request$/, ".png")}`;
                  writeFileSync(join(runDir, screenshot), Buffer.from(answer.image, "base64"), { flag: "wx", mode: 0o600 });
                }
                emit("browser", { command: command.command, ok: true, responseBytes: Buffer.byteLength(JSON.stringify(answer)), screenshot });
              } catch (error) {
                emit("browser", { command: command.command, ok: false, error: error.message });
                throw error;
              }
            } else if (command.kind === "test") {
              if (run.launches.length >= settings.testLaunchLimit) {
                run.launchLimitExceeded = true;
                emit("launch_limit");
                throw new Error("The test launch limit has been reached.");
              }
              const attemptId = String(run.launches.length + 1).padStart(3, "0");
              const candidate = copyCandidate(workspace, runDir, `${attemptId}.spec.ts`);
              const launch = {
                attemptId, ...summarize(candidate),
                elapsedMs: Math.round(performance.now() - agentStart), status: "started",
              };
              run.launches.push(launch);
              if (!first) {
                first = candidate;
                run.candidates.first = summarize(first);
              }
              emit("test_started", { attemptId, candidateSha256: candidate.sha256 });
              save();
              const launched = await execute({ scratch, staged, dir: join(runDir, "executions", attemptId), clean,
                candidate, settings, deadline, signal: interrupt.signal });
              launch.status = launched.status;
              launch.exitCode = launched.exitCode;
              launch.evidence = `executions/${attemptId}/execution.json`;
              save();
              emit("test_finished", { attemptId, status: launched.status, raw: launch.evidence });
              answer = { output: launched.agentOutput, code: launched.status === "passed" ? 0 : 1 };
            } else {
              throw new Error("Invalid benchmark tool request.");
            }
          } catch (error) {
            answer = { error: error.message };
          }
          const response = join(bridge, file.replace(/\.request$/, ".response"));
          try {
            writeFileSync(response, JSON.stringify(answer), { flag: "wx" });
          } catch (error) {
            if (!["EEXIST", "ENOENT"].includes(error.code)) throw error;
          }
        }
        if (!agentDone) await delay(100);
      }
      await complete;
      await logs;
    } finally {
      clearTimeout(timeout);
      interrupt.signal.removeEventListener("abort", stopAgent);
      try {
        run.rollout = captureRollout(privateDir, runDir);
      } catch (error) {
        run.telemetryError = error.message;
      } finally {
        rmSync(join(privateDir, "auth.json"), { force: true });
      }
    }

    const last = run.launches.at(-1);
    try {
      const candidate = copyCandidate(workspace, runDir, "final.spec.ts");
      if (candidate.sha256 !== hash(readFileSync(join(templates, "calc.spec.ts"))) || last) {
        final = candidate;
        run.candidates.final = { ...summarize(final), verifiedLaunch: last?.sha256 === final.sha256 };
      }
    } catch (error) {
      run.finalCandidateError = error.message;
    }
    run.discovery = app.upstream.requests.map(({ chunks, ...entry }) => entry);
    await discovery.close();
    discovery = null;
    await discoveryServer.close();
    discoveryServer = null;
    await app.shutdown();
    app = null;
    interrupt.signal.throwIfAborted();

    const mutationByHash = new Map();
    for (const [role, candidate] of Object.entries({ first, final })) {
      if (!candidate) continue;
      const dir = join(runDir, "replays", role);
      const replay = await execute({ scratch, staged, dir, clean, candidate, settings, signal: interrupt.signal });
      run.replays[role] = relative(runDir, join(dir, "execution.json"));
      save();
      if (replay.status !== "passed" || !replay.upstream.some((entry) => entry.completed)) continue;
      if (mutationByHash.has(candidate.sha256)) {
        run.mutations[role] = mutationByHash.get(candidate.sha256);
        continue;
      }
      const evidence = {};
      for (const kind of ["add", "multiply"]) {
        const dir = join(runDir, "mutations", role, kind);
        await execute({ scratch, staged, dir, clean: { ...clean, fixture: mutationFixtures[kind] },
          candidate, settings, signal: interrupt.signal });
        evidence[kind] = relative(runDir, join(dir, "execution.json"));
      }
      mutationByHash.set(candidate.sha256, evidence);
      run.mutations[role] = evidence;
    }
    interrupt.signal.throwIfAborted();
    run.outcome = run.agent.timedOut ? "timed_out" : run.agent.exitCode === 0 ? "completed" : "codex_failed";
  } catch (error) {
    run.error = error.message;
    run.outcome = interrupt.signal.aborted ? "interrupted" : "infrastructure_failure";
    console.error(error.message);
  } finally {
    const cleanupErrors = [];
    for (const cleanup of [
      () => stopProcess(agent, true), () => discovery?.close(), () => discoveryServer?.close(),
      () => app?.shutdown(), () => rmSync(scratch, { recursive: true, force: true }),
    ]) {
      try {
        await cleanup();
      } catch (error) {
        cleanupErrors.push(error.message);
      }
    }
    if (cleanupErrors.length) run.cleanupErrors = cleanupErrors;
    run.finishedAt = new Date().toISOString();
    run.durationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
    save();
    gradeTrial(runDir);
  }
  return run.outcome;
}

for (let order = 1; order <= trials; order++) {
  if (interrupt.signal.aborted) break;
  const outcome = await runTrial(order);
  if (outcome === "infrastructure_failure" || outcome === "codex_failed") process.exitCode = 1;
}
