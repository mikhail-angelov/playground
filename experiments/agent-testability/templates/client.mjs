import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const [kind, command, ...rest] = process.argv.slice(2);
if (kind === "browser" && (!command || command === "help")) {
  console.log(`./browser goto <local-url>
./browser url
./browser snapshot [css]
./browser dom <css>
./browser text <css>
./browser click <css>
./browser fill <css> <value>
./browser press <css> <key>
./browser screenshot
Add --frame '<iframe CSS>' after a command to target a frame.
Example: ./browser snapshot --frame 'iframe'
./run-test`);
  process.exit(0);
}
const dir = new URL("./", import.meta.url).pathname;
const path = `${dir}bridge/${randomUUID()}`;
await writeFile(path + ".tmp", JSON.stringify({ kind, command, args: rest }), { flag: "wx" });
await rename(path + ".tmp", path + ".request");
for (let check = 0; check < 1800; check++) {
  try {
    const answer = JSON.parse(await readFile(path + ".response", "utf8"));
    if (answer.image) {
      await mkdir("screenshots", { recursive: true });
      const screenshot = `screenshots/${randomUUID()}.png`;
      await writeFile(screenshot, Buffer.from(answer.image, "base64"), { flag: "wx" });
      console.log(screenshot);
    }
    if (answer.output) console.log(answer.output);
    if (answer.error) console.error(answer.error);
    process.exit(answer.code ?? (answer.error ? 1 : 0));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await delay(100);
}
throw new Error("The benchmark runner did not respond.");
