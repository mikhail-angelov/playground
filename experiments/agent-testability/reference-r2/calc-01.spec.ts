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
  const dom = await body.locator("[id], main, nav, section, ul, li, form, label, a, button, input, textarea, iframe, output, [role], [contenteditable]")
    .evaluateAll((elements) => elements.map((element) => ({
      tag: element.tagName.toLowerCase(),
      attributes: Object.fromEntries(Array.from(element.attributes)
        .filter(({ name }) => /^(id|role|aria-.+|title|placeholder|href|disabled|type|name|for)$/.test(name))
        .map(({ name, value }) => [name, value])),
      text: element.textContent?.trim().slice(0, 100),
    })));
  const ids = dom.flatMap(({ attributes }) => attributes.id ? [attributes.id] : []);
  expect(new Set(ids).size, `unique IDs in ${name}`).toBe(ids.length);
  for (const { attributes } of dom) {
    for (const attribute of ["for", "aria-labelledby", "aria-describedby", "aria-controls"]) {
      for (const id of attributes[attribute]?.split(/\s+/).filter(Boolean) ?? []) {
        expect(ids, `${name}: ${attribute} resolves ${id}`).toContain(id);
      }
    }
  }
  await writeFile(info.outputPath(`${name}.dom.json`), JSON.stringify(dom, null, 2) + "\n");
  await writeFile(info.outputPath(`${name}.aria.yml`), await body.ariaSnapshot());
}

test.beforeEach(async ({ page, context, baseURL }) => {
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
});

test("CALC-01: generate, patch and run a calculator, then add and multiply", async ({ page }, info) => {
  const iframe = page.frameLocator("#application-preview");
  const editor = page.locator("#source-editor .view-lines");
  await test.step("C1 — open a fresh project", async () => {
    await page.goto("/my");
    await expect(page.getByRole("link", { name: "New project" })).toHaveAttribute("id", "new-project");
    const collections = page.getByRole("navigation", { name: "Project collections" });
    await expect(collections.getByRole("link", { name: "My Projects" })).toHaveAttribute("aria-current", "page");
    const list = page.getByRole("main", { name: "My projects" }).getByRole("list", { name: "My projects" });
    await expect(list).toHaveAttribute("id", "project-list");
    await snapshot("projects", page.locator("body"), info);

    await page.goto("/");
    const newProject = page.getByRole("main").getByRole("link", { name: "Started New Project" });
    await expect(newProject).toHaveAttribute("id", "new-project");
    await snapshot("landing", page.locator("body"), info);
    await newProject.click();
    await expect(page).toHaveURL(/\/project\/[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i);
    await expect(page.getByText("New Project", { exact: true })).toBeVisible();
    await expect(iframe.locator("canvas")).toBeVisible();
    await expect(editor).toContainText("canvas");
    const workspace = page.getByRole("main", { name: "Project workspace" });
    const editorRegion = workspace.getByRole("region", { name: "Source editor" });
    await expect(editorRegion.getByRole("textbox", { name: /^Source code for index\.html/ })).toBeAttached();
    const files = workspace.getByRole("region", { name: "Files" });
    await expect(files.getByRole("button", { name: "index.html", pressed: true })).toBeVisible();
    await files.getByRole("button", { name: "style.css" }).press("Enter");
    await expect(editorRegion.getByRole("textbox", { name: /^Source code for style\.css/ })).toBeAttached();
    await files.getByRole("button", { name: "index.html" }).press("Enter");
    await expect(editorRegion.getByRole("textbox", { name: /^Source code for index\.html/ })).toBeAttached();
    await expect(page.getByTitle("Application preview")).toHaveAttribute("id", "application-preview");
    await expect(page.getByRole("log", { name: "Console Output" })).toHaveAttribute("id", "preview-console");
    await expect(page.getByRole("button", { name: "Clear console output" })).toHaveAttribute("aria-controls", "preview-console");
    await snapshot("project", page.locator("body"), info);
  });

  const aiToggle = page.getByRole("button", { name: "AI", exact: true });
  await expect(aiToggle).toHaveAttribute("id", "ai-tab");
  await aiToggle.click();
  await expect(aiToggle).toHaveAttribute("aria-pressed", "true");
  const assistant = page.getByRole("region", { name: "AI assistant" });
  const form = assistant.getByRole("form", { name: "Generate application" });
  const input = form.getByRole("textbox", { name: "Application prompt" });
  const generate = form.getByRole("button", { name: "Generate application" });
  const status = assistant.locator("#ai-status");
  const conversation = assistant.getByRole("log", { name: "Conversation" });
  await expect(input).toBeEditable();
  await expect(input).toHaveAttribute("id", "ai-prompt");
  await expect(input).toHaveAttribute("name", "prompt");
  await expect(generate).toHaveAttribute("id", "ai-generate");
  await expect(generate).toHaveAttribute("type", "submit");
  await expect(conversation).toHaveAttribute("id", "ai-conversation");
  await expect(form.getByRole("button", { name: "Clear history" })).toHaveAttribute("id", "ai-clear-history");
  await expect(status).toHaveText("Ready to generate");
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
    await expect(status).toHaveText("Generating application");
    await expect(conversation).toHaveAttribute("aria-busy", "true");
    await expect(generate).toBeDisabled();
    await snapshot("ai-generating", page.locator("body"), info);
  });

  const patch = form.getByRole("button", { name: "Apply generated code" });
  await expect(patch).toHaveAttribute("id", "ai-apply-code");
  await test.step("C3 — verify generation completed with source code", async () => {
    const stream = await clientStream.bytes;
    await writeFile(join(process.env.JS2GO_RUN_DIR!, "browser.sse"), stream);
    expect(stream.toString("utf8").trimEnd()).toMatch(/data: \{"content":"\[DONE\]"\}$/);
    await expect(input).toBeEditable();
    await expect(status).toHaveText("Generation completed");
    await expect(conversation).toHaveAttribute("aria-busy", "false");
    await expect(conversation.getByText(prompt, { exact: true })).toBeVisible();
    await expect(conversation.locator('code[class^="language-html:"]')).toContainText('id="calculator-equals"');
    await snapshot("ai-completed", page.locator("body"), info);
  });

  await test.step("C4 — patch the code and verify the editor changes", async () => {
    await patch.click();
    await expect(editor).toContainText(/calculator/i);
    await expect(editor).not.toContainText("<canvas");
    await expect(assistant.getByRole("status").filter({ hasText: /^Code applied to / }))
      .toHaveText(/index\.html/);
    await snapshot("ai-applied", page.locator("body"), info);
  });

  const calculator = iframe.getByRole("main", { name: "Calculator" });
  const controls = calculator.getByRole("group", { name: "Calculator controls" });
  const digit = (value: number) => controls.getByRole("button", { name: String(value), exact: true });
  const add = controls.getByRole("button", { name: "+ Add" });
  const multiply = controls.getByRole("button", { name: "× Multiply" });
  const equals = controls.getByRole("button", { name: "= Equals" });
  const clear = controls.getByRole("button", { name: "AC Clear" });
  const display = calculator.getByRole("status", { name: "Result" });

  await test.step("C5 — run the patched project in the preview iframe", async () => {
    const previewToggle = page.getByRole("button", { name: "Preview", exact: true });
    await expect(previewToggle).toHaveAttribute("id", "preview-tab");
    await previewToggle.click();
    await expect(previewToggle).toHaveAttribute("aria-pressed", "true");
    await expect(iframe.locator("canvas")).toBeVisible();
    const run = page.getByRole("button", { name: /^Run/ });
    await expect(run).toHaveAttribute("id", "preview-run");
    await expect(run).toHaveAttribute("aria-controls", "application-preview");
    await run.click();
    await expect(calculator).toHaveAttribute("id", "calculator");
    await expect(display).toHaveAttribute("id", "calculator-display");
    await expect(add).toHaveAttribute("id", "calculator-add");
    await expect(multiply).toHaveAttribute("id", "calculator-multiply");
    await expect(equals).toHaveAttribute("id", "calculator-equals");
    await expect(clear).toHaveAttribute("id", "calculator-clear");
    for (let value = 0; value <= 9; value++) {
      await expect(digit(value)).toHaveAttribute("id", `calculator-digit-${value}`);
    }
    await expect(display).toHaveText("0");
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

  await clear.click();
  await digit(6).press("6");
  await digit(6).press("/");
  await digit(6).press("0");
  await digit(6).press("Enter");
  await expect(display).toHaveText("Error");
  await snapshot("calculator-error", iframe.locator("body"), info);
});

test("generation and apply feedback distinguish errors from completion", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Started New Project" }).click();
  await page.getByRole("button", { name: "AI", exact: true }).click();
  const assistant = page.getByRole("region", { name: "AI assistant" });
  const status = assistant.locator("#ai-status");
  const input = assistant.getByRole("textbox", { name: "Application prompt" });
  const generate = assistant.getByRole("button", { name: "Generate application" });
  const conversation = assistant.getByRole("log", { name: "Conversation" });
  await assistant.getByRole("button", { name: "Apply generated code" }).click();
  await expect(assistant.getByRole("alert").filter({ hasText: "No generated code to apply" })).toBeAttached();

  const cases = [
    ['data: {"content":"Partial response"}\n\n', "Generation ended before the response was complete."],
    ['data: {"content":"[DONE]"}\n\n', "Generation returned no response."],
  ];
  let body = "";
  await page.route("**/api/ai", (route) => route.fulfill({ contentType: "text/event-stream", body }));
  for (const [stream, message] of cases) {
    body = stream;
    await expect(input).toBeEditable();
    await input.fill(prompt);
    await input.press("Shift+Enter");
    await expect(input).toHaveValue(prompt + "\n");
    await input.fill(prompt);
    await generate.click();
    await expect(status).toHaveText("Generation failed");
    await expect(assistant.getByRole("alert").filter({ hasText: message })).toBeAttached();
    await expect(conversation).toBeEmpty();
  }
  await snapshot("ai-error", page.locator("body"), info);
  await assistant.getByRole("button", { name: "Clear history" }).click();
  await expect(status).toHaveText("Ready to generate");
});
