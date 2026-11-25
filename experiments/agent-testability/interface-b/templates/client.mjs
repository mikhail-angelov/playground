import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const [kind, command, ...rest] = process.argv.slice(2);
if (kind === "browser" && (!command || command === "help")) {
  console.log(`./browser goto <local-url>
./browser url
./browser snapshot [target] [--full]
./browser dom [target]
./browser text [target] [--max-chars 2000]
./browser click <target>
./browser fill <target> <value>
./browser press <target> <key>
./browser wait <target> [--text value | --attribute name=value | --state state] [--timeout 60000]
./browser screenshot

A target is CSS or --role <role> [--name <exact accessible name>].
Use --scope-role <role> [--scope-name <name>] to work inside a named region, or --frame <iframe CSS> for a frame.
Snapshots are compact by default. Read a specific element with text or request more with --full.
Wait states include visible, hidden, attached, detached, enabled and disabled.

./browser snapshot --role region --name 'Search results'
./browser click --role button --name 'Search'
./browser wait --role status --text 'Search complete'
./run-test`);
  process.exit(0);
}
const path = fileURLToPath(new URL(`./bridge/${randomUUID()}`, import.meta.url));
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
