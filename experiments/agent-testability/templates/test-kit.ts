import { test as base } from "@playwright/test";
import { restrictBrowser } from "./browser-routes.mjs";

export { expect } from "@playwright/test";

export const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    await restrictBrowser(context, baseURL, {
      monacoURL: process.env.JS2GO_MONACO_URL!,
      monacoRoot: process.env.JS2GO_MONACO_ROOT!,
    });
    await use(context);
  },
});
