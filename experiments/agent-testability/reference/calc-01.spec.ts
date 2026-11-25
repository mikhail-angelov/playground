import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { calculatorPrompt as prompt } from "../harness/upstream.mjs";

const require = createRequire(import.meta.url);
const monaco = require("monaco-editor/package.json");
const monacoRoot = dirname(require.resolve("monaco-editor/package.json"));
const monacoURL = `https://cdn.jsdelivr.net/npm/monaco-editor@${monaco.version}/min/vs/`;

async function observeClientStream(page: Page) {
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  const { promise, resolve } = Promise.withResolvers<Buffer>();
  const chunks: Buffer[] = [];
  let requestId: string | undefined;
  let prefix: Promise<string>;

  // Read UTF-8 bytes directly because Chromium may decode an SSE response without a charset as text.
  session.on("Network.responseReceived", (event) => {
    if (new URL(event.response.url).pathname !== "/api/ai" || event.type !== "Fetch") return;
    requestId = event.requestId;
    prefix = session.send("Network.streamResourceContent", { requestId })
      .then(({ bufferedData }) => bufferedData, () => "");
  });
  session.on("Network.dataReceived", (event) => {
    if (event.requestId === requestId && event.data) chunks.push(Buffer.from(event.data, "base64"));
  });
  session.on("Network.loadingFinished", async (event) => {
    if (event.requestId === requestId) {
      resolve(Buffer.concat([Buffer.from(await prefix, "base64"), ...chunks]));
    }
  });
  session.on("Network.loadingFailed", (event) => {
    if (event.requestId === requestId) resolve(Buffer.alloc(0));
  });
  return { bytes: promise };
}

async function snapshot(name: string, body: Locator, info: TestInfo) {
  const dom = await body.locator("[id], a, button, input, textarea, iframe, [role], [contenteditable]")
    .evaluateAll((elements) => elements.map((element) => ({
      tag: element.tagName.toLowerCase(),
      attributes: Object.fromEntries(Array.from(element.attributes)
        .filter(({ name }) => /^(id|role|aria-.+|title|placeholder|href|disabled|type|name)$/.test(name))
        .map(({ name, value }) => [name, value])),
      text: element.textContent?.trim().slice(0, 100),
    })));
  await writeFile(info.outputPath(`${name}.dom.json`), JSON.stringify(dom, null, 2) + "\n");
  await writeFile(info.outputPath(`${name}.aria.yml`), await body.ariaSnapshot());
}

test("CALC-01: generate, patch and run a calculator, then add and multiply", async ({ page, context, baseURL }, info) => {
  await context.routeWebSocket("**/*", (socket) => socket.close());
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.frame() !== page.mainFrame()) return route.abort();
    if (url.origin === baseURL) return route.continue();
    if (request.url().startsWith(monacoURL)) {
      const asset = request.url().slice(monacoURL.length);
      if (/^[a-zA-Z0-9_/-]+(?:\.[a-zA-Z0-9_-]+)+$/.test(asset)) {
        const path = join(monacoRoot, "min/vs", asset);
        if (existsSync(path)) return route.fulfill({ path, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }
    return route.abort();
  });

  const iframe = page.frameLocator('iframe[title="Preview"]');
  const editor = page.locator(".monaco-editor .view-lines");
  await test.step("C1 — open a fresh project", async () => {
    await page.goto("/my");
    const newProject = page.getByRole("link", { name: "New", exact: true });
    await expect(newProject).toBeVisible();
    await snapshot("projects", page.locator("body"), info);
    await newProject.click();
    await expect(page).toHaveURL(/\/project\/[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i);
    await expect(page.getByText("New Project", { exact: true })).toBeVisible();
    await expect(iframe.locator("canvas")).toBeVisible();
    await expect(editor).toContainText("canvas");
    await snapshot("project", page.locator("body"), info);
  });

  await page.getByRole("button", { name: "AI", exact: true }).click();
  const input = page.getByPlaceholder("Describe your application idea...");
  await expect(input).toBeEditable();
  await snapshot("ai-idle", page.locator("body"), info);
  const clientStream = await observeClientStream(page);
  await test.step("C2 — submit the fixed prompt", async () => {
    await input.fill(prompt);
    const [generated] = await Promise.all([
      page.waitForResponse((response) => new URL(response.url()).pathname === "/api/ai" && response.request().method() === "POST"),
      input.press("Enter"),
    ]);
    expect(generated.request().postDataJSON()).toMatchObject({ prompt, history: [] });
    expect(generated.ok()).toBe(true);
    expect(generated.headers()["content-type"]).toContain("text/event-stream");
  });

  const patch = page.getByTitle("Patch generated code to project");
  await test.step("C3 — verify generation completed with source code", async () => {
    const stream = await clientStream.bytes;
    await writeFile(join(process.env.JS2GO_RUN_DIR!, "browser.sse"), stream);
    expect(stream.toString("utf8").trimEnd()).toMatch(/data: \{"content":"\[DONE\]"\}$/);
    await expect(input).toBeEditable();
    await expect(page.getByText(prompt, { exact: true })).toBeVisible();
    await expect(page.locator('code[class^="language-html:"]')).toContainText(/<button\b/i);
    await snapshot("ai-completed", page.locator("body"), info);
  });

  await test.step("C4 — patch the code and verify the editor changes", async () => {
    await patch.click();
    await expect(editor).toContainText(/calculator/i);
    await expect(editor).not.toContainText("<canvas");
  });

  const digit = (value: number) => iframe.getByRole("button", { name: String(value), exact: true });
  const add = iframe.getByRole("button", { name: /^(?:\+|add)$/i });
  const multiply = iframe.getByRole("button", { name: /^(?:[×*x]|multiply)$/i });
  const equals = iframe.getByRole("button", { name: /^(?:=|equals)$/i });
  const clear = iframe.getByRole("button", { name: /^(?:C|AC|Clear)$/i });
  const display = iframe.locator("#result");

  await test.step("C5 — run the patched project in the preview iframe", async () => {
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(iframe.locator("canvas")).toBeVisible();
    await page.getByRole("button", { name: /^Run/ }).click();
    await expect(digit(0)).toBeVisible();
    await expect(display).toBeVisible();
    await snapshot("calculator", iframe.locator("body"), info);
  });

  await test.step("C6 — calculate 12 + 8 = 20", async () => {
    await digit(1).click();
    await digit(2).click();
    await add.click();
    await digit(8).click();
    await equals.click();
    await expect(display).toHaveText(/^20$/);
  });
  await test.step("C7 — clear the result", async () => {
    await clear.click();
    await expect(display).toHaveText(/^0$/);
  });
  await test.step("C8 — calculate 6 × 7 = 42", async () => {
    await digit(6).click();
    await multiply.click();
    await digit(7).click();
    await equals.click();
    await expect(display).toHaveText(/^42$/);
  });
});
