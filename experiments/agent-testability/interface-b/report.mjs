import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonLines } from "../harness/codex-events.mjs";

const experiment = fileURLToPath(new URL("../", import.meta.url));
const artifacts = join(experiment, "artifacts");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const lines = (path) => {
  const records = jsonLines(path).map(({ data }) => data);
  return records.length && records.every(Boolean) ? records : null;
};
const a = read(join(experiment, "configs", "frozen-harness.json"));
const b = join(experiment, "configs", "frozen-interface-b.json");
const pins = { A: a.experimentId, B: existsSync(b) ? read(b).experimentId : null };
const interaction = new Set(["goto", "click", "fill", "press"]);
const semantic = new Set(["getByRole", "getByLabel", "getByText", "getByPlaceholder", "getByAltText", "getByTitle"]);

function responseMetrics(rollout) {
  if (!rollout) return {};
  let calls = [];
  let processPollingResponses = 0;
  const inputSizes = [];
  for (const { type, payload } of rollout) {
    if (type === "response_item" && payload?.type === "custom_tool_call") calls.push(payload.input ?? "");
    if (type !== "token_usage_record") continue;
    if (Number.isFinite(payload.usage?.input_tokens)) inputSizes.push(payload.usage.input_tokens);
    const names = calls.flatMap((call) => [...call.matchAll(/\btools\.(\w+)\s*\(/g)].map((match) => match[1]));
    if (names.length && names.every((name) => name === "write_stdin")) processPollingResponses++;
    calls = [];
  }
  return inputSizes.length ? { processPollingResponses, largestObservedInputTokens: Math.max(...inputSizes) } : {};
}

function toolMetrics(events) {
  if (!events) return {};
  const browser = events.filter(({ type }) => type === "browser");
  const snapshots = browser.filter(({ command, ok }) => command === "snapshot" && ok);
  let observed = false;
  let repeatedSnapshots = 0;
  for (const { command, ok } of browser) {
    if (ok && interaction.has(command)) observed = false;
    if (ok && command === "snapshot") {
      if (observed) repeatedSnapshots++;
      observed = true;
    }
  }
  return {
    snapshotCalls: snapshots.length,
    snapshotBytes: snapshots.every(({ responseBytes }) => Number.isFinite(responseBytes))
      ? snapshots.reduce((sum, snapshot) => sum + snapshot.responseBytes, 0) : null,
    repeatedSnapshots,
    domInspections: browser.filter(({ command }) => command === "dom").length,
    failedInteractions: browser.filter(({ command, ok }) => interaction.has(command) && ok === false).length,
    waits: browser.filter(({ command }) => command === "wait").length,
    failedWaits: browser.filter(({ command, ok }) => command === "wait" && ok === false).length,
  };
}

function testResults(suites = []) {
  return suites.flatMap((suite) => [
    ...(suite.specs ?? []).flatMap((spec) => (spec.tests ?? []).flatMap((test) => test.results ?? [])),
    ...testResults(suite.suites),
  ]);
}

function row(relative) {
  const directory = join(artifacts, dirname(relative));
  const run = read(join(artifacts, relative));
  const metricsPath = join(directory, "metrics.json");
  const metrics = existsSync(metricsPath) ? read(metricsPath) : {};
  const gradePath = join(directory, "grade.json");
  const grade = existsSync(gradePath) ? read(gradePath) : null;
  const final = grade?.candidates?.final;
  const calls = Object.entries(final?.source?.locatorCalls ?? {});
  const total = calls.filter(([name]) => name === "locator" || name.startsWith("getBy")).reduce((sum, [, count]) => sum + count, 0);
  const firstLaunch = run.launches[0]?.evidence;
  const playwright = firstLaunch && join(directory, dirname(firstLaunch), "playwright.json");
  const durations = playwright && existsSync(playwright) ? testResults(read(playwright).suites).map(({ duration }) => duration) : [];
  return {
    ...metrics, variant: run.experimentId === pins.A ? "A" : "B", revision: run.revision, trialId: run.trialId,
    outcome: run.outcome, modelStarted: Boolean(run.agent?.startedAt), evidence: relative,
    ...responseMetrics(lines(join(directory, "codex.rollout.jsonl"))),
    ...(run.agent?.startedAt ? toolMetrics(lines(join(directory, "tool-events.jsonl"))) : {}),
    firstTestDurationMs: durations.length === 1 ? durations[0] : null,
    semanticLocatorRatio: total ? calls.filter(([name]) => semantic.has(name)).reduce((sum, [, count]) => sum + count, 0) / total : null,
    finalSource: final?.candidate?.file ? join(dirname(relative), final.candidate.file) : null,
    finalSourceIssues: final?.source?.issues ?? [],
  };
}

const runs = readdirSync(artifacts, { recursive: true }).sort()
  .filter((file) => Object.values(pins).includes(file.split("/")[0]) && /\/(?:main|smoke)-[^/]+\/run\.json$/.test(file));
const trials = runs.filter((file) => /\/main-/.test(file)).map(row);
const smoke = runs.filter((file) => /\/smoke-/.test(file)).map(row);
const cells = [];
for (const revision of ["R0", "R1", "R2"]) {
  for (const variant of ["A", "B"]) cells.push({ id: variant + revision.slice(1), rows: trials.filter((trial) => trial.revision === revision && trial.variant === variant) });
}
const metrics = {
  llmResponsesObserved: "Observed LLM responses", inputTokens: "Input tokens", uncachedInputTokens: "Uncached input tokens",
  largestObservedInputTokens: "Largest observed input, tokens", snapshotCalls: "Successful snapshots", snapshotBytes: "Snapshot payload bytes",
  repeatedSnapshots: "Snapshots repeated between UI actions", domInspections: "DOM inspections", failedInteractions: "Failed UI interactions",
  waits: "Explicit state waits", failedWaits: "Failed state waits", processPollingResponses: "LLM responses dedicated to process polling",
  timeToFirstCandidateMs: "Time to first immutable launch, ms", firstTestDurationMs: "First Playwright test duration, ms",
  repairIterations: "Repair iterations", semanticLocatorRatio: "Semantic locator ratio", agentWallMs: "Agent time, ms",
};
const showMedian = (values) => values.length ? Number(((values[(values.length - 1) >> 1] + values[values.length >> 1]) / 2).toFixed(2)) : "—";
const rate = (label, predicate) => `| ${label} | ${cells.map(({ rows }) => rows.length ? `${rows.filter(predicate).length}/${rows.length}` : "—").join(" | ")} |`;
const md = [
  "# CALC-01 browser interface comparison", "",
  "The cells share application revisions, recorded fixtures, the user brief and toolchain versions. B changes browser commands and their instructions.", "",
  `| Metric | ${cells.map(({ id }) => id).join(" | ")} |`, `|---|${cells.map(() => "---:").join("|")}|`,
  `| Main starts | ${cells.map(({ rows }) => rows.length).join(" | ")} |`,
  `| Codex sessions | ${cells.map(({ rows }) => rows.filter(({ modelStarted }) => modelStarted).length).join(" | ")} |`,
  rate("Raw first replay pass / all starts", ({ rawFirstReplayPass }) => rawFirstReplayPass),
  rate("Strict first pass / all starts", ({ firstCandidatePass }) => firstCandidatePass),
  rate("Strict final pass / all starts", ({ finalCandidatePass }) => finalCandidatePass),
  rate("Both final mutations caught / all starts", ({ addMutationKilled, multiplyMutationKilled }) => addMutationKilled && multiplyMutationKilled),
];
for (const [key, label] of Object.entries(metrics)) {
  md.push(`| Median ${label} | ${cells.map(({ rows }) => showMedian(rows.map((trial) => trial[key]).filter(Number.isFinite).sort((x, y) => x - y))).join(" | ")} |`);
}
md.push("", "The largest input is taken from recorded response usage. Snapshot size is measured in bytes of the recorded tool payload.",
  "Repeated snapshots are consecutive observations without a successful UI action between them. Dedicated process polling counts responses that only wait on an existing command session; waits inside an initial command request share that response.",
  "The locator ratio uses calls in the final candidate source. Role, label and other user-facing locator methods count as semantic. A dash marks absent measurements.", "");
const sourceIssues = trials.filter((trial) => trial.finalSourceIssues.length);
if (sourceIssues.length) {
  md.push("## Strict source checks", "");
  for (const trial of sourceIssues) {
    for (const issue of trial.finalSourceIssues) {
      md.push(`- ${trial.variant}${trial.revision.slice(1)} [${trial.trialId}](${trial.finalSource}), line ${issue.line ?? "—"}. ${issue.reason}.`);
    }
  }
  md.push("");
}
if (smoke.length) {
  const show = (value) => value ?? "—";
  md.push("## Smoke diagnostics", "",
    "| Cell | Trial | Strict first pass | LLM responses | Input tokens | Snapshot bytes | Explicit waits | Failed waits | Poll-only LLM responses |",
    "|---|---|---|---:|---:|---:|---:|---:|---:|");
  for (const trial of smoke) {
    md.push(`| ${trial.variant}${trial.revision.slice(1)} | [${trial.trialId}](${trial.evidence}) | ${show(trial.firstValidity)} | ${show(trial.llmResponsesObserved)} | ${show(trial.inputTokens)} | ${show(trial.snapshotBytes)} | ${show(trial.waits)} | ${show(trial.failedWaits)} | ${show(trial.processPollingResponses)} |`);
  }
  md.push("");
}
md.push("[Per-trial source data](interface-summary.json)", "");
writeFileSync(join(artifacts, "interface-summary.json"), JSON.stringify({ schemaVersion: 1, pins, trials, smoke }, null, 2) + "\n");
const report = join(artifacts, "interface-report.md");
writeFileSync(report, md.join("\n"));
console.log(report);
