import { existsSync } from "node:fs";
import { join } from "node:path";

export async function restrictBrowser(context, baseURL, { monacoURL, monacoRoot }) {
  await context.routeWebSocket("**/*", (socket) => socket.close());
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.frame().parentFrame()) return route.abort();
    if (url.origin === baseURL) return route.continue();
    if (url.href.startsWith(monacoURL)) {
      const asset = url.href.slice(monacoURL.length);
      if (/^[a-zA-Z0-9_/-]+(?:\.[a-zA-Z0-9_-]+)+$/.test(asset)) {
        const path = join(monacoRoot, asset);
        if (existsSync(path)) return route.fulfill({ path, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }
    return route.abort();
  });
}
