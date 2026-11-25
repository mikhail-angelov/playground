import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { release } from "node:os";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";
import { experiment, repository, require, hash, loadBaseline, startApp } from "./reset.mjs";

const mode = process.argv[2] ?? "--replay";
if (!["--replay", "--capture"].includes(mode) || process.argv.length > 3) {
  throw new Error("Usage: npm run agent:reference -- [--replay|--capture]");
}

const key = process.env.JS2GO_RECORD_DEEPSEEK_KEY;
if (mode === "--capture" && !key) throw new Error("Set JS2GO_RECORD_DEEPSEEK_KEY for capture.");
if (!existsSync(chromium.executablePath())) throw new Error("Install Chromium with npx playwright install chromium.");

const clean = loadBaseline("R0", mode === "--capture");
const { baseline, fixture } = clean;

const artifacts = join(experiment, "artifacts");
mkdirSync(artifacts, { recursive: true });
const runDir = mkdtempSync(join(artifacts, `${mode.slice(2)}-`));
const playwrightCore = dirname(require.resolve("playwright-core/package.json"));
const browser = JSON.parse(readFileSync(join(playwrightCore, "browsers.json"))).browsers
  .find(({ name }) => name === "chromium-headless-shell");
const environment = {
  node: process.version,
  npm: process.env.npm_config_user_agent?.match(/npm\/(\S+)/)?.[1] ?? null,
  os: `${process.platform} ${release()} ${process.arch}`,
  playwright: require("@playwright/test/package.json").version,
  browser,
  dependenciesSha256: hash(readFileSync(join(repository, "package-lock.json"))),
  playwrightConfigSha256: hash(readFileSync(join(experiment, "playwright.config.ts"))),
};
const run = {
  schemaVersion: 1,
  mode: mode.slice(2),
  ...baseline,
  fixtureSha256: fixture ? baseline.fixtureSha256 : null,
  fixtureSource: fixture?.source ?? "live-deepseek",
  environment,
  environmentSha256: hash(JSON.stringify(environment)),
  startedAt: new Date().toISOString(),
  outcome: "failed",
};
console.log(`Private reference artifacts: ${runDir}`);

let app;
try {
  app = await startApp({ ...clean, key, runDir });
  const { baseURL, storage, upstream } = app;
  const result = spawn(process.execPath, [require.resolve("@playwright/test/cli"), "test", "--config", join(experiment, "playwright.config.ts")], {
    cwd: repository,
    stdio: "inherit",
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
      JS2GO_BASE_URL: baseURL,
      JS2GO_RUN_DIR: runDir,
      JS2GO_STORAGE_STATE: storage,
    },
  });
  const [exitCode] = await once(result, "exit");
  const request = upstream.requests[0];
  const browserStream = join(runDir, "browser.sse");
  if (mode === "--capture" && request?.completed && existsSync(browserStream)) {
    const recording = {
      schemaVersion: 1,
      source: "recorded-deepseek",
      acquiredAt: request.startedAt,
      provider: baseline.provider,
      model: baseline.model,
      upstreamChunks: request.chunks,
      browserStream: readFileSync(browserStream, "utf8"),
    };
    const captured = gzipSync(JSON.stringify(recording, null, 2) + "\n");
    writeFileSync(join(runDir, "capture.json.gz"), captured);
    run.fixtureSha256 = hash(captured);
  }
  if (exitCode !== 0 || upstream.requests.length !== 1 || !request?.completed) {
    throw new Error(request?.error ?? "CALC-01 reference or upstream stream failed.");
  }
  if (fixture && readFileSync(browserStream, "utf8") !== fixture.browserStream) {
    throw new Error("The replayed client SSE differs from the frozen fixture.");
  }
  run.outcome = "passed";
} catch (error) {
  run.error = error.message;
  process.exitCode = 1;
  console.error(error.message);
} finally {
  if (app) run.upstream = app.upstream.requests.map(({ chunks, ...request }) => request);
  run.finishedAt = new Date().toISOString();
  writeFileSync(join(runDir, "run.json"), JSON.stringify(run, null, 2) + "\n");
  await app?.shutdown();
}
