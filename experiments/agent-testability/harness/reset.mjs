import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { once } from "node:events";
import { createWriteStream, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer, request } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import jwt from "jsonwebtoken";
import { startUpstream } from "./upstream.mjs";

export const experiment = fileURLToPath(new URL("../", import.meta.url));
export const repository = fileURLToPath(new URL("../../../", import.meta.url));
export const require = createRequire(import.meta.url);
export const hash = (data) => createHash("sha256").update(data).digest("hex");
export const readJSON = (path) => JSON.parse(readFileSync(path, "utf8"));
export function loadBaseline(revision, capture = false) {
  const baseline = readJSON(join(experiment, "configs/baseline.json"));
  if (revision !== baseline.revision) throw new Error(`No frozen baseline for ${revision}.`);
  const commit = execFileSync("git", ["rev-parse", `${baseline.sourceSha}^{commit}`], { cwd: repository }).toString().trim();
  if (commit !== baseline.sourceSha) throw new Error("Product source commit does not match.");
  const bytes = capture ? null : readFileSync(join(experiment, "fixtures", `${revision}.json.gz`));
  if (bytes && hash(bytes) !== baseline.fixtureSha256) throw new Error("Fixture SHA-256 does not match.");
  const archive = execFileSync("git", ["archive", commit], { cwd: repository, maxBuffer: 32 * 1024 * 1024 });
  return { baseline, archive, fixture: bytes && JSON.parse(gunzipSync(bytes)) };
}

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

async function close(server) {
  if (!server?.listening) return;
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
}

async function waitForApp(baseURL, app) {
  for (let check = 0; check < 240; check++) {
    if (app.exitCode !== null || app.signalCode !== null) throw new Error("Next.js exited before startup.");
    try {
      const result = await fetch(baseURL + "/favicon.ico", { signal: AbortSignal.timeout(1000) });
      await result.body?.cancel();
      if (result.ok) return;
    } catch {
      // The dev server may still be starting.
    }
    await delay(250);
  }
  throw new Error("Next.js did not become ready.");
}

export async function stopProcess(process, group = false) {
  if (!process?.pid || process.exitCode !== null || process.signalCode !== null) return;
  const exited = once(process, "exit");
  const signal = (name) => {
    try {
      if (group) globalThis.process.kill(-process.pid, name);
      else process.kill(name);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  };
  signal("SIGTERM");
  const force = setTimeout(() => signal("SIGKILL"), 5000);
  try {
    await exited;
  } finally {
    clearTimeout(force);
  }
}

export async function startApp({ archive, baseline, fixture, key, runDir, proxyAuth = false }) {
  mkdirSync(runDir, { recursive: true });
  const checkout = mkdtempSync(join(tmpdir(), "js2go-reset-"));
  let app, appLog, upstream, proxy, nextPort;

  async function shutdown() {
    try {
      await stopProcess(app, true);
    } finally {
      if (appLog) await new Promise((resolve) => appLog.end(resolve));
      await close(proxy);
      await close(upstream?.server);
      rmSync(checkout, { recursive: true, force: true });
    }
  }

  try {
    execFileSync("tar", ["-xf", "-", "-C", checkout], { input: archive });
    symlinkSync(join(repository, "node_modules"), join(checkout, "node_modules"), "dir");
    const reserved = createServer();
    nextPort = await listen(reserved);
    await close(reserved);
    const nextURL = `http://127.0.0.1:${nextPort}`;
    const dbPath = join(checkout, "trial.sqlite");
    const jwtSecret = randomBytes(32).toString("hex");
    const email = "calc-01@example.test";
    const database = new Database(dbPath);
    try {
      migrate(drizzle(database), { migrationsFolder: join(checkout, "src/db/migrations") });
      database.prepare("INSERT INTO users (id, email, api) VALUES (1, ?, ?)")
        .run(email, JSON.stringify(JSON.stringify({ provider: baseline.provider, key: "local-upstream-only" })));
    } finally {
      database.close();
    }

    const token = jwt.sign({ userId: 1, email }, jwtSecret, { expiresIn: "1h" });
    let baseURL = nextURL;
    let storage = null;
    if (proxyAuth) {
      // Use one local identity on the server side. Browser contexts never receive the JWT.
      proxy = createServer((incoming, response) => {
        let pathname;
        try {
          pathname = decodeURIComponent(new URL(incoming.url, "http://127.0.0.1").pathname);
        } catch {
          response.writeHead(400).end();
          return;
        }
        const runtimeAsset = ["script", "style", "image", "font", "worker"].includes(incoming.headers["sec-fetch-dest"]);
        if (/^\/(?:__nextjs|_nextjs|__webpack)|\.map$/i.test(pathname) ||
            (pathname.startsWith("/_next/") && (!pathname.startsWith("/_next/static/") || !runtimeAsset))) {
          response.writeHead(404).end();
          return;
        }
        const headers = { ...incoming.headers, cookie: `auth_token=${token}` };
        const forward = request({
          hostname: "127.0.0.1", port: nextPort, method: incoming.method, path: incoming.url, headers,
        }, (result) => {
          delete result.headers["set-cookie"];
          response.writeHead(result.statusCode, result.headers);
          result.on("error", () => response.destroy());
          result.pipe(response);
        });
        forward.on("error", () => {
          if (response.headersSent) response.destroy();
          else response.writeHead(502).end();
        });
        response.on("close", () => forward.destroy());
        incoming.pipe(forward);
      });
      baseURL = `http://127.0.0.1:${await listen(proxy)}`;
    } else {
      storage = join(checkout, "storage-state.json");
      writeFileSync(storage, JSON.stringify({
        cookies: [{
          name: "auth_token", value: token, domain: "127.0.0.1", path: "/",
          expires: -1, httpOnly: true, secure: false, sameSite: "Lax",
        }],
        origins: [],
      }), { mode: 0o600 });
    }

    upstream = await startUpstream({ fixture, model: baseline.model, key });
    app = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(nextPort)], {
      cwd: checkout,
      env: {
        PATH: process.env.PATH,
        NEXT_TELEMETRY_DISABLED: "1",
        // The pinned Next development build otherwise embeds original sources in browser bundles.
        ...(proxyAuth ? { __NEXT_TEST_MODE: "1" } : {}),
        DB_STORAGE: dbPath,
        JWT_SECRET: jwtSecret,
        APP_URL: baseURL,
        APP_HOST: baseURL,
        AI_BASE_URL_DEEPSEEK: upstream.url,
        AI_MODEL_DEEPSEEK: baseline.model,
      },
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    appLog = createWriteStream(join(runDir, "next.log"));
    app.stdout.pipe(appLog, { end: false });
    app.stderr.pipe(appLog, { end: false });
    await waitForApp(baseURL, app);
    return { baseURL, storage, upstream, shutdown };
  } catch (error) {
    await shutdown();
    throw error;
  }
}
