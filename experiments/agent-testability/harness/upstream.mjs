import { createServer } from "node:http";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

export const calculatorPrompt = "Create a simple calculator with digit buttons, addition, multiplication, equals and clear. Display the current result.";

export async function startUpstream({ fixture, model, key }) {
  const requests = [];
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/chat/completions") {
      response.writeHead(404).end();
      return;
    }

    const entry = { startedAt: new Date().toISOString(), chunks: [], chunkCount: 0 };
    requests.push(entry);
    const started = performance.now();
    try {
      const body = [];
      for await (const chunk of request) body.push(chunk);
      const payload = JSON.parse(Buffer.concat(body).toString());
      if (payload.stream !== true || payload.model !== model ||
          !payload.messages?.some(({ role, content }) => role === "user" && content === calculatorPrompt)) {
        throw new Error("Unexpected generator request");
      }
      if (!fixture && requests.length !== 1) throw new Error("Capture allows one provider request");

      if (fixture) {
        response.writeHead(200, { "Content-Type": "text/event-stream" }).flushHeaders();
        for (const { atMs, text } of fixture.upstreamChunks) {
          const remainingMs = atMs - (performance.now() - started);
          if (remainingMs > 0) await delay(remainingMs);
          if (response.destroyed) return;
          response.write(text);
          entry.chunkCount++;
        }
      } else {
        const live = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(75_000),
          redirect: "error",
        });
        entry.providerStatus = live.status;
        if (!live.ok || !live.body || !live.headers.get("content-type")?.includes("text/event-stream")) {
          await live.body?.cancel();
          throw new Error(`Provider returned HTTP ${live.status} without a usable SSE stream`);
        }
        response.writeHead(200, { "Content-Type": "text/event-stream" }).flushHeaders();
        const decoder = new TextDecoder("utf-8", { ignoreBOM: true });
        for await (const chunk of live.body) {
          const text = decoder.decode(chunk, { stream: true });
          if (text) entry.chunks.push({ atMs: Math.round(performance.now() - started), text });
          if (!response.destroyed) {
            response.write(chunk);
            entry.chunkCount++;
          }
        }
        const tail = decoder.decode();
        if (tail) entry.chunks.push({ atMs: Math.round(performance.now() - started), text: tail });
      }
      entry.completed = true;
      response.end();
    } catch (error) {
      entry.error = error.message;
      if (!response.headersSent) response.writeHead(400);
      response.end();
    } finally {
      entry.wallMs = Math.round(performance.now() - started);
    }
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, requests, url: `http://127.0.0.1:${server.address().port}` };
}
