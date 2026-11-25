import { defineConfig } from "@playwright/test";

const settings = JSON.parse(process.env.JS2GO_PLAYWRIGHT!);
export default defineConfig({
  testDir: ".",
  testMatch: "calc.spec.ts",
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: settings.testTimeoutMs,
  expect: { timeout: settings.expectTimeoutMs },
  reporter: [["list"], ["json", { outputFile: "output/playwright.json" }]],
  outputDir: "output/results",
  use: {
    baseURL: process.env.JS2GO_BASE_URL,
    browserName: "chromium",
    connectOptions: { wsEndpoint: process.env.JS2GO_BROWSER! },
    viewport: settings.viewport,
    locale: settings.locale,
    timezoneId: settings.timezoneId,
    actionTimeout: settings.actionTimeoutMs,
    trace: "on",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
  },
});
