import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const experiment = fileURLToPath(new URL(".", import.meta.url));
const repository = resolve(experiment, "../..");
const configDir = join(experiment, "configs");
const read = (path) => readFileSync(path);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { interface: { type: "string", default: "A" } },
});
if (positionals.length !== 1 || !["A", "B"].includes(values.interface)) {
  throw new Error("Usage: node experiments/agent-testability/stage-revision.mjs <revision-config.json> [--interface A|B]");
}
const revisionConfig = resolve(positionals[0]);
const revision = JSON.parse(read(revisionConfig));
const frozen = JSON.parse(read(join(configDir, "frozen-harness.json")));
if (!/^R[012]$/.test(revision.revision) || !/^[a-f0-9]{40}$/.test(revision.sourceSha ?? "")) {
  throw new Error("The revision config must pin a product commit before benchmarking.");
}
const commit = git(repository, ["rev-parse", "--verify", `${revision.sourceSha}^{commit}`]);
if (commit !== revision.sourceSha) throw new Error("Product commit does not match the revision pin.");
if (revision.sourceTree && git(repository, ["rev-parse", `${commit}:src`]) !== revision.sourceTree) {
  throw new Error("The product commit differs from the source tree used for the reference test.");
}

const file = `${revision.revision}.json.gz`;
const fixturePath = join(experiment, "fixtures", file);
if (hash(read(fixturePath)) !== revision.fixtureSha256) throw new Error("Fixture SHA-256 does not match the revision pin.");

const stage = realpathSync(mkdtempSync(join(tmpdir(), "js2go-measurement-")));
let added = false;
try {
  git(repository, ["worktree", "add", "--detach", "--no-checkout", stage, commit]);
  added = true;
  const staged = join(stage, "experiments", "agent-testability");
  mkdirSync(join(staged, "configs"), { recursive: true });
  mkdirSync(join(staged, "fixtures"));
  for (const folder of ["harness", "templates", "briefs"]) {
    cpSync(join(experiment, folder), join(staged, folder), { recursive: true });
  }
  cpSync(revisionConfig, join(staged, "configs", "baseline.json"));
  cpSync(join(configDir, "experiment.json"), join(staged, "configs", "experiment.json"));
  cpSync(fixturePath, join(staged, "fixtures", file));
  if (revision.revision !== "R0") {
    // The frozen runner uses this private recording to verify that sandbox reads are denied.
    cpSync(join(experiment, "fixtures", "R0.json.gz"), join(staged, "fixtures", "R0.json.gz"));
  }
  for (const name of ["package.json", "package-lock.json"]) {
    cpSync(join(repository, name), join(stage, name));
  }
  symlinkSync(join(repository, "node_modules"), join(stage, "node_modules"), "dir");
  symlinkSync(join(experiment, "artifacts"), join(staged, "artifacts"), "dir");

  // The reporting display changed after R0 started. Restore the measured bytes in this worktree.
  const reporter = join(staged, "harness", "report.mjs");
  if (hash(read(reporter)) !== frozen.reportSha256) {
    git(stage, ["apply", "--reverse", "--directory=experiments/agent-testability", join(configDir, "report-after-freeze.patch")]);
  }
  const stagedHashes = () => {
    const entries = ["harness", "templates"].flatMap((folder) => readdirSync(join(staged, folder)).sort()
      .map((name) => [`${folder}/${name}`, hash(read(join(staged, folder, name)))]));
    const prompt = ["templates/instructions.md", "briefs/calc-01.md"].map((name) => read(join(staged, name)).toString().trimEnd()).join("\n\n");
    return { harnessSha256: hash(JSON.stringify(entries)), promptTemplateSha256: hash(prompt) };
  };
  const matches = (pin) => Object.entries(stagedHashes()).every(([key, value]) => pin[key] === value);
  if (!matches(frozen) || hash(read(join(staged, "configs", "experiment.json"))) !== frozen.configSha256 ||
    hash(read(join(stage, "package-lock.json"))) !== frozen.lockSha256) {
    throw new Error(`The staged measurement files differ from R0 experiment ${frozen.experimentId}.`);
  }
  if (values.interface === "B") {
    for (const name of ["harness/browser.mjs", "templates/client.mjs", "templates/instructions.md"]) {
      cpSync(join(experiment, "interface-b", name), join(staged, name));
    }
    const pin = JSON.parse(read(join(configDir, "frozen-interface-b.json")));
    if (!matches(pin)) throw new Error(`The staged interface differs from B experiment ${pin.experimentId}.`);
  }
  console.log(stage);
} catch (error) {
  if (added) git(repository, ["worktree", "remove", "--force", stage]);
  else rmSync(stage, { force: true, recursive: true });
  throw error;
}
