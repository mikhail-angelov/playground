import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { expect } from "@playwright/test";
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

const options = {
  frame: { type: "string" }, role: { type: "string" }, name: { type: "string" },
  "scope-role": { type: "string" }, "scope-name": { type: "string" },
  text: { type: "string" }, attribute: { type: "string" }, state: { type: "string" },
  timeout: { type: "string" }, full: { type: "boolean" }, "max-chars": { type: "string" },
};

function boundedInteger(value, fallback, maximum, flag) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
    throw new Error(`${flag} must be an integer from 1 to ${maximum}.`);
  }
  return number;
}

function limit(text, maximum) {
  if (text.length <= maximum) return text;
  const notice = "\n[Output truncated]";
  if (maximum <= notice.length) return text.slice(0, maximum);
  return text.slice(0, maximum - notice.length) + notice;
}

function compactSnapshot(snapshot) {
  return snapshot.split("\n").map((line) => {
    const block = line.match(/^(\s*- code(?: [^:]*)?): (.*)$/);
    if (block && block[2].length > 120) return `${block[1]}: [content omitted, ${block[2].length} characters]`;
    return line.length > 240 ? line.slice(0, 237) + "..." : line;
  }).join("\n");
}

function exactText(text) {
  const escaped = text.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`^\\s*${escaped}\\s*$`);
}

async function waitFor(locator, values, timeout) {
  const conditions = [values.text, values.attribute, values.state].filter((value) => value !== undefined);
  if (conditions.length > 1) throw new Error("Choose one wait condition.");
  if (values.text !== undefined) {
    await expect(locator.filter({ hasText: exactText(values.text) })).toHaveText(values.text, { timeout });
  } else if (values.attribute !== undefined) {
    const attribute = values.attribute.match(/^([\w:-]+)=(.*)$/s);
    if (!attribute) throw new Error("Use --attribute name=value.");
    await expect(locator).toHaveAttribute(attribute[1], attribute[2], { timeout });
  } else if (values.state === "enabled") {
    await expect(locator).toBeEnabled({ timeout });
  } else if (values.state === "disabled") {
    await expect(locator).toBeDisabled({ timeout });
  } else {
    await locator.waitFor({ state: values.state ?? "visible", timeout });
  }
}

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
      async act(command, args) {
        const { values, positionals } = parseArgs({ args, options, allowPositionals: true });
        if (command === "goto") {
          const url = new URL(positionals[0] ?? "/", baseURL);
          if (url.origin !== baseURL) throw new Error("Choose a URL on the local app.");
          await page.goto(url.href, { waitUntil: "domcontentloaded" });
          return { output: page.url() };
        }
        if (command === "url") return { output: page.url() };
        if (command === "screenshot") return { image: (await page.screenshot()).toString("base64") };

        if (values.name !== undefined && !values.role) throw new Error("--name requires --role.");
        if (values["scope-name"] !== undefined && !values["scope-role"]) throw new Error("--scope-name requires --scope-role.");
        const root = values.frame ? page.frameLocator(values.frame) : page;
        const scope = values["scope-role"]
          ? root.getByRole(values["scope-role"], { name: values["scope-name"], exact: true }) : root;
        const selector = values.role ? null : positionals.shift();
        const [value] = positionals;
        if (!values.role && !selector && !["snapshot", "text", "dom"].includes(command)) {
          throw new Error("Provide a CSS selector or --role with an optional --name.");
        }
        if (positionals.length !== (["fill", "press"].includes(command) ? 1 : 0)) throw new Error("Unexpected positional arguments.");
        const locator = values.role ? scope.getByRole(values.role, { name: values.name, exact: true })
          : selector ? scope.locator(selector) : values["scope-role"] ? scope : root.locator("body");
        const timeout = boundedInteger(values.timeout, command === "wait" ? 60000 : settings.actionTimeoutMs, 60000, "--timeout");
        const output = (text, fallback) => ({ output: limit(text, boundedInteger(values["max-chars"], fallback, 20000, "--max-chars")) });

        switch (command) {
          case "snapshot": {
            const snapshot = await locator.ariaSnapshot({ timeout });
            return values.full ? output(snapshot, 20000) : output(compactSnapshot(snapshot), 6000);
          }
          case "dom": {
            const elements = await locator.evaluateAll((nodes) => nodes.slice(0, 50).map((node) => ({
              tag: node.tagName.toLowerCase(),
              attributes: Object.fromEntries([...node.attributes].map(({ name, value }) => [name, value.slice(0, 160)])),
              text: node.innerText?.trim().slice(0, 180),
            })));
            return output(JSON.stringify(elements), 6000);
          }
          case "text":
            return output(await locator.innerText({ timeout }), 2000);
          case "click":
            await locator.click({ timeout });
            break;
          case "fill":
            await locator.fill(value, { timeout });
            break;
          case "press":
            await locator.press(value, { timeout });
            break;
          case "wait":
            await waitFor(locator, values, timeout);
            break;
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
