import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const artifacts = fileURLToPath(new URL("./artifacts/", import.meta.url));
const readJSON = (file) => JSON.parse(readFileSync(file, "utf8"));
const parseLines = (lines) => lines.trim().split("\n").filter(Boolean).map(JSON.parse);
const config = readJSON(fileURLToPath(new URL("./configs/frozen-harness.json", import.meta.url)));
const humanPath = [
  "Create new project", "Open AI", "Enter the prompt", "Send", "Apply", "Open Preview", "Run",
  "1", "2", "+", "8", "=", "Clear", "6", "×", "7", "=",
];
const inputMethods = new Set([
  "click", "dblclick", "tap", "fill", "press", "pressSequentially", "type", "selectOption", "check", "uncheck",
  "setChecked", "keyboardPress", "keyboardType", "keyboardInsertText", "mouseClick", "mouseDblclick", "touchscreenTap",
]);
const navigationMethods = new Set(["goto", "reload", "goBack", "goForward"]);
const inputActors = new Set(["Page", "Frame", "ElementHandle"]);
const discoveryMethods = new Set(["click", "fill", "press"]);

function replayActions(dir) {
  const run = readJSON(join(dir, "run.json"));
  const directory = join(dir, dirname(run.replays.final));
  const traces = readdirSync(directory, { recursive: true }).filter((file) => file.endsWith("trace.zip"));
  if (traces.length !== 1) throw new Error("Expected one trace from the final replay.");
  const trace = join(directory, traces[0]);
  const members = execFileSync("unzip", ["-Z1", trace], { encoding: "utf8" }).split("\n")
    .filter((name) => /^\d+-trace\.trace$/.test(name));
  if (!members.length) throw new Error("The trace has no recorded browser calls.");

  const events = members.flatMap((name) => parseLines(execFileSync("unzip", ["-p", trace, name], {
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  })));
  const outcomes = new Map(events.filter(({ type }) => type === "after").map((event) => [event.callId, event]));
  const source = events.filter(({ type, class: actor }) => type === "before" && inputActors.has(actor));
  const calls = source.filter(({ method }) => inputMethods.has(method));
  if (!calls.length || calls.some(({ callId }) => !outcomes.has(callId))) {
    throw new Error("The trace does not contain complete browser input outcomes.");
  }
  const failed = calls.filter(({ callId }) => outcomes.get(callId).error).length;
  return {
    trace: relative(artifacts, trace),
    replayUiActions: calls.length - failed, replayFailedUiActions: failed,
    replayNavigations: source.filter(({ method }) => navigationMethods.has(method)).length,
  };
}

function observe(trial) {
  const dir = dirname(join(artifacts, trial.evidence));
  const toolLog = join(dir, "tool-events.jsonl");
  const actions = existsSync(toolLog) ? parseLines(readFileSync(toolLog, "utf8"))
    .filter(({ type, command }) => type === "browser" && discoveryMethods.has(command)) : null;
  const reviewFile = join(dir, "review.json");
  const row = {
    trialId: trial.trialId, revision: trial.revision, testLaunches: trial.testLaunches,
    reviewedCandidates: existsSync(reviewFile) ? Object.keys(readJSON(reviewFile).candidates).length : 0,
    discoveryUiActions: actions?.length ?? null,
    discoveryFailedUiActions: actions?.filter(({ ok }) => ok === false).length ?? null,
  };
  try {
    const counts = replayActions(dir);
    return { ...row, ...counts, replayToHumanRatio: counts.replayUiActions / humanPath.length };
  } catch (error) {
    return { ...row, replayUiActions: null, replayToHumanRatio: null, unavailable: error.message.split("\n")[0] };
  }
}

const summary = readJSON(join(artifacts, "summary.json"));
const main = summary.trials.filter((trial) => trial.series === "main" && trial.evidence.startsWith(`${config.experimentId}/`));
const rows = main.filter((trial) => trial.finalCandidatePass === true).map(observe);
const median = (values) => (values[(values.length - 1) >> 1] + values[values.length >> 1]) / 2;
const display = (value) => value == null ? "—" : String(value);
const tabulate = (values) => values.length ? `${median(values)} (${values[0]}–${values.at(-1)})` : "—";
const revisions = ["R0", "R1", "R2"];
const markdown = [
  "", "## UI actions and automation", "",
  `CALC-01 has a ${humanPath.length}-action reference path from the open JS2Go landing page through all eight checkpoints.`,
  "UI actions count completed input calls, with entering the prompt counted once. Opening the application URL is a separate navigation count.",
  "The ratio is completed browser inputs in one strict final replay divided by the reference path. A ratio of 1.00 matches the reference path in length.",
  "Successful final replays are shown here. Coverage, repairs and infrastructure failures are reported above.", "",
  "| Revision | Replays with a trace | Replay UI actions, median (range) | Median replay-to-human ratio | Agent discovery inputs, median (range) |",
  "|---|---:|---:|---:|---:|",
];
for (const revision of revisions) {
  const data = rows.filter((row) => row.revision === revision);
  const values = (key) => data.map((row) => row[key]).filter(Number.isFinite).sort((a, b) => a - b);
  const counts = values("replayUiActions");
  const ratio = counts.length ? (median(counts) / humanPath.length).toFixed(2) : "—";
  markdown.push(`| ${revision} | ${counts.length}/${data.length} | ${tabulate(counts)} | ${ratio} | ${tabulate(values("discoveryUiActions"))} |`);
}
markdown.push("", "One automated replay requires zero user inputs after it starts. Candidate review is recorded against the SHA of the submitted test.", "",
  "| Revision | Trial | Replay inputs | Discovery inputs | Playwright launches | Reviewed candidate hashes |",
  "|---|---|---:|---:|---:|---:|");
for (const row of rows) {
  markdown.push(`| ${row.revision} | ${row.trialId} | ${display(row.replayUiActions)} | ${display(row.discoveryUiActions)} | ${display(row.testLaunches)} | ${row.reviewedCandidates} |`);
}
markdown.push("", "[Action counts and trace paths](actions.json)", "");

const trialRuns = main.map((trial) => ({
  trial,
  run: readJSON(join(artifacts, dirname(trial.evidence), "run.json")),
})).sort((a, b) => a.run.revision.localeCompare(b.run.revision) || a.run.startedAt.localeCompare(b.run.startedAt));
markdown.push("## Codex cost per main trial", "",
  "The all-started totals above include infrastructure failures. The model-session results below use trials that reached Codex.", "",
  "| Revision | Codex sessions | Strict first pass in those sessions | Strict final pass in those sessions | Stopped before Codex |",
  "|---|---:|---:|---:|---:|");
for (const revision of revisions) {
  const data = trialRuns.filter(({ run }) => run.revision === revision);
  const started = data.filter(({ run }) => run.agent?.startedAt);
  const first = started.filter(({ trial }) => trial.firstCandidatePass).length;
  const final = started.filter(({ trial }) => trial.finalCandidatePass).length;
  markdown.push(`| ${revision} | ${started.length} | ${started.length ? `${first}/${started.length}` : "—"} | ${started.length ? `${final}/${started.length}` : "—"} | ${data.length - started.length} |`);
}
markdown.push("", "Cached tokens are included in input. Observed LLM responses are counted by distinct response IDs.", "",
  "| Revision | Trial | Outcome | Input tokens | Cached input | Output tokens | LLM responses | Agent seconds |",
  "|---|---|---|---:|---:|---:|---:|---:|");
for (const { trial, run } of trialRuns) {
  const usage = [trial.inputTokens, trial.cachedInputTokens, trial.outputTokens, trial.llmResponsesObserved]
    .map((value) => value == null ? "—" : value.toLocaleString("en-US"));
  const seconds = trial.agentWallMs == null ? "—" : (trial.agentWallMs / 1000).toFixed(1);
  markdown.push(`| ${run.revision} | [${run.trialId}](${trial.evidence}) | ${trial.outcome} | ${usage.join(" | ")} | ${seconds} |`);
}
markdown.push("", "This is a small recorded-response series on one scenario. The revisions were run sequentially, so the differences are descriptive.", "");

writeFileSync(join(artifacts, "actions.json"), JSON.stringify({
  schemaVersion: 1, experimentId: config.experimentId, referenceUiActions: humanPath.length, referencePath: humanPath, rows,
}, null, 2) + "\n");
appendFileSync(join(artifacts, "report.md"), markdown.join("\n"));
