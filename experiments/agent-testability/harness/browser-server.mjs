import { chromium } from "playwright";

const server = await chromium.launchServer({
  ...JSON.parse(process.env.JS2GO_CHROMIUM),
  host: "127.0.0.1",
});
console.log(server.wsEndpoint());
process.stdin.resume();
process.stdin.once("end", () => server.close());
