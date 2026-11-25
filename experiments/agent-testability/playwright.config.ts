import { defineConfig } from "@playwright/test";

const { JS2GO_RUN_DIR, JS2GO_BASE_URL, JS2GO_STORAGE_STATE } = process.env;
if (!JS2GO_RUN_DIR || !JS2GO_BASE_URL || !JS2GO_STORAGE_STATE) {
  throw new Error("Start this reference suite with npm run agent:reference.");
}

export default defineConfig({
  testDir: "./reference",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["json", { outputFile: `${JS2GO_RUN_DIR}/playwright.json` }]],
  outputDir: `${JS2GO_RUN_DIR}/playwright`,
  use: {
    baseURL: JS2GO_BASE_URL,
    storageState: JS2GO_STORAGE_STATE,
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    locale: "en-US",
    timezoneId: "UTC",
    trace: "on",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
    launchOptions: {
      args: [
        "--proxy-server=http://127.0.0.1:1",
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
      ],
    },
  },
});
