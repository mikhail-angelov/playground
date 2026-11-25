import { dirname, join } from "node:path";
import { chromium } from "playwright";
import { require } from "./reset.mjs";
import { restrictBrowser } from "../templates/browser-routes.mjs";

const monaco = require.resolve("monaco-editor/package.json");
export const monacoAssets = {
  monacoURL: `https://cdn.jsdelivr.net/npm/monaco-editor@${require(monaco).version}/min/vs/`,
  monacoRoot: join(dirname(monaco), "min/vs"),
};

export const chromiumOptions = {
  headless: true,
  args: [
    "--proxy-server=http://127.0.0.1:1",
    "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
  ],
};

export async function discover(baseURL, settings, endpoint) {
  const browser = await chromium.connect(endpoint);
  try {
    const context = await browser.newContext({
      viewport: settings.viewport, locale: settings.locale, timezoneId: settings.timezoneId,
      serviceWorkers: "block",
    });
    await restrictBrowser(context, baseURL, monacoAssets);
    const page = await context.newPage();
    page.setDefaultTimeout(settings.actionTimeoutMs);

    return {
      close: () => browser.close(),
      async act(command, rawArgs) {
        const args = [...rawArgs];
        const index = args.indexOf("--frame");
        const frame = index < 0 ? null : args.splice(index, 2)[1];
        if (index >= 0 && !frame) throw new Error("--frame requires an iframe CSS selector.");
        const target = frame ? page.frameLocator(frame) : page;
        const [selector, value] = args;
        const locator = target.locator(selector ?? "body");

        switch (command) {
          case "goto": {
            const url = new URL(selector ?? "/", baseURL);
            if (url.origin !== baseURL) throw new Error("Choose a URL on the local app.");
            await page.goto(url.href, { waitUntil: "domcontentloaded" });
            return { output: page.url() };
          }
          case "url":
            return { output: page.url() };
          case "snapshot":
            return { output: (await locator.ariaSnapshot()).slice(0, 20000) };
          case "dom": {
            const elements = await locator.evaluateAll((nodes) => nodes.slice(0, 100).map((node) => ({
              tag: node.tagName.toLowerCase(),
              attributes: Object.fromEntries([...node.attributes].map(({ name, value }) => [name, value.slice(0, 160)])),
              text: node.innerText?.trim().slice(0, 180),
            })));
            return { output: JSON.stringify(elements).slice(0, 20000) };
          }
          case "text":
            return { output: (await locator.innerText()).slice(0, 20000) };
          case "click":
            await locator.click();
            break;
          case "fill":
            await locator.fill(value);
            break;
          case "press":
            await locator.press(value);
            break;
          case "screenshot":
            return { image: (await page.screenshot()).toString("base64") };
          default:
            throw new Error("Unknown browser command. Run ./browser help.");
        }
        return { output: "OK" };
      },
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
