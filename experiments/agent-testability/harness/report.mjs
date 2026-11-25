import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { codexMetrics } from "./codex-events.mjs";
import { experiment, readJSON } from "./reset.mjs";

const root = join(experiment, "artifacts");
mkdirSync(root, { recursive: true });
const trials = readdirSync(root, { recursive: true }).sort()
  .filter((file) => /^[a-f0-9]{16}\/[^/]+\/[^/]+\/run\.json$/.test(file))
  .map((file) => {
    const metric = file.replace(/run\.json$/, "metrics.json");
    if (existsSync(join(root, metric))) return { evidence: metric, ...readJSON(join(root, metric)) };
    const run = readJSON(join(root, file));
    return {
      evidence: file, interruptedOrUngraded: true, trialId: run.trialId, series: run.series, revision: run.revision,
      outcome: run.outcome === "running" ? "interrupted_or_in_progress" : run.outcome,
      agentWallMs: run.agent?.wallMs ?? null, infrastructureFailure: run.outcome === "infrastructure_failure",
      ...codexMetrics(dirname(join(root, file))),
    };
  })
  .filter(({ series }) => ["smoke", "pilot", "main"].includes(series));
const bySeries = Object.fromEntries(["smoke", "pilot", "main"].map((id) => [id, trials.filter(({ series }) => series === id)]));
const revisions = ["R0", "R1", "R2"];
const missingFields = {
  inputTokens: "No complete input token observation in the CLI events.",
  cachedInputTokens: "No cached input token observation in the CLI events.",
  outputTokens: "No complete output token observation in the CLI events.",
  llmResponsesObserved: "No confirmed response_id in the matching Codex rollout.",
  discoveryCalls: "No started agent with a runner event stream.",
  generationWaitMs: "No healthy generation in the final independent replay.",
  timeToValidTestMs: "No earliest independently validated launch could be identified.",
  addMutationKilled: "No conclusive addition control result.",
  multiplyMutationKilled: "No conclusive multiplication control result.",
};
const count = (rows, field) => rows.filter((row) => row[field] === true).length;
const observed = (rows, key) => rows.map((row) => row[key]).filter(Number.isFinite).sort((a, b) => a - b);
const median = (values) => values.length ? (values[Math.floor(values.length / 2)] + values[Math.floor((values.length - 1) / 2)]) / 2 : null;
const rate = (numerator, denominator) => denominator ? 100 * numerator / denominator : null;
function summarize(rows) {
  const durations = observed(rows, "agentWallMs");
  const paired = rows.filter(({ inputTokens, cachedInputTokens }) => Number.isFinite(inputTokens) && Number.isFinite(cachedInputTokens));
  const inputs = paired.reduce((sum, row) => sum + row.inputTokens, 0);
  const eligible = rows.filter(({ infrastructureFailure }) => !infrastructureFailure);
  const responseUsage = (total, field) => median(rows.filter((row) => row[total] == null)
    .map((row) => row.responseUsageSum?.[field]).filter(Number.isFinite).sort((a, b) => a - b));
  return {
    trials: rows.length,
    infrastructureFailures: count(rows, "infrastructureFailure"),
    rawFirstReplayPassPct: rate(count(rows, "rawFirstReplayPass"), rows.length),
    strictFirstPassPct: rate(count(rows, "firstCandidatePass"), rows.length),
    strictFirstPassWithoutInfrastructurePct: rate(count(eligible, "firstCandidatePass"), eligible.length),
    strictFinalPassPct: rate(count(rows, "finalCandidatePass"), rows.length),
    medianAgentWallMs: median(durations),
    p90AgentWallMs: durations.length ? durations[Math.ceil(durations.length * 0.9) - 1] : null,
    medianInputTokens: median(observed(rows, "inputTokens")),
    medianCachedInputTokens: median(observed(rows, "cachedInputTokens")),
    medianOutputTokens: median(observed(rows, "outputTokens")),
    medianPartialInputTokens: responseUsage("inputTokens", "input_tokens"),
    medianPartialCachedInputTokens: responseUsage("cachedInputTokens", "cached_input_tokens"),
    medianPartialOutputTokens: responseUsage("outputTokens", "output_tokens"),
    cachedInputPct: rate(paired.reduce((sum, row) => sum + row.cachedInputTokens, 0), inputs),
    medianLlmResponsesObserved: median(observed(rows, "llmResponsesObserved")),
    medianDiscoveryCalls: median(observed(rows, "discoveryCalls")),
    medianRepairIterations: median(observed(rows, "repairIterations")),
    locatorOrSyncFailures: rows.filter(({ failureCategories }) => failureCategories?.some((kind) =>
      ["locator_ambiguous", "locator_or_sync", "sync_or_timeout"].includes(kind))).length,
    addMutationKilled: count(rows, "addMutationKilled"),
    multiplyMutationKilled: count(rows, "multiplyMutationKilled"),
    pendingFinalReview: rows.filter(({ finalValidity }) => finalValidity === "unverified").length,
    missing: Object.fromEntries(Object.entries(missingFields).map(([key, explanation]) => [
      key, { trials: rows.filter((row) => row[key] == null).length, explanation },
    ])),
  };
}

const laps = [...new Set(trials.map(({ evidence }) => evidence.split("/")[0]))].sort();
const summaries = Object.fromEntries(laps.map((id) => [id, Object.fromEntries(Object.entries(bySeries).map(([series, rows]) => [
  series, Object.fromEntries(revisions.map((revision) => [revision, summarize(rows.filter((row) => row.revision === revision && row.evidence.startsWith(`${id}/`)))])),
]))]));
writeFileSync(join(root, "summary.json"), JSON.stringify({ schemaVersion: 1, experiments: summaries, trials }, null, 2) + "\n");

const labels = {
  trials: "Trials", infrastructureFailures: "Infrastructure failures", rawFirstReplayPassPct: "Raw first replay pass (%)",
  strictFirstPassPct: "Strict first candidate pass (%)", strictFirstPassWithoutInfrastructurePct: "Strict first pass without infrastructure failures (%)",
  strictFinalPassPct: "Strict final candidate pass (%)", medianAgentWallMs: "Median agent wall time (ms)",
  p90AgentWallMs: "p90 agent wall time (ms)", medianInputTokens: "Median input tokens",
  medianCachedInputTokens: "Median cached input tokens", medianOutputTokens: "Median output tokens",
  medianPartialInputTokens: "Median observed input tokens when the total is unavailable",
  medianPartialCachedInputTokens: "Median observed cached input tokens when the total is unavailable",
  medianPartialOutputTokens: "Median observed output tokens when the total is unavailable",
  cachedInputPct: "Cached share of input (%)", medianLlmResponsesObserved: "Median observed LLM responses",
  medianDiscoveryCalls: "Median browser discovery calls",
  medianRepairIterations: "Median repair iterations", locatorOrSyncFailures: "Trials with locator or synchronization failures",
  addMutationKilled: "Addition controls detected", multiplyMutationKilled: "Multiplication controls detected",
  pendingFinalReview: "Pending final evidence reviews",
};
const csv = ["experiment,series,metric,R0,R1,R2,delta_R0_R1,delta_R1_R2"];
const md = [
  "# JS2Go agent testability", "",
  "Strict first-pass uses every started trial in its series. The infrastructure sensitivity analysis uses a second denominator.",
  "Pilot and main comparisons use one harness and config hash at a time. Smoke verifies the setup and has its own section.", "",
];
if (!laps.length) md.push("No trial artifacts are available.", "");
const display = (value) => value == null ? "—" : Number(value.toFixed(2)).toString();
const delta = (a, b) => a == null || b == null ? null : b - a;
for (const [id, series] of Object.entries(summaries)) {
  for (const [name, data] of Object.entries(series)) {
    md.push(`## ${name} · ${id}`, "");
    if (!revisions.some((revision) => data[revision].trials)) {
      md.push("No trials recorded.", "");
      continue;
    }
    md.push("| Metric | R0 | R1 | R2 | Δ R0→R1 | Δ R1→R2 |", "|---|---:|---:|---:|---:|---:|");
    for (const [metric, label] of Object.entries(labels)) {
      const [r0, r1, r2] = revisions.map((revision) => data[revision].trials || metric === "trials" ? data[revision][metric] : null);
      const values = [r0, r1, r2, data.R0.trials && data.R1.trials ? delta(r0, r1) : null,
        data.R1.trials && data.R2.trials ? delta(r1, r2) : null];
      md.push(`| ${label} | ${values.map(display).join(" | ")} |`);
      csv.push([id, name, metric, ...values.map((value) => value == null ? "" : display(value))].join(","));
    }
    md.push("");
    for (const revision of revisions) {
      for (const [field, { trials: missing, explanation }] of Object.entries(data[revision].missing)) {
        if (missing) md.push(`- ${revision} \`${field}\` was unavailable in ${missing} trial(s). ${explanation}`);
      }
    }
    md.push("");
  }
}
const unfinished = trials.filter(({ interruptedOrUngraded }) => interruptedOrUngraded).map(({ evidence }) => evidence);
if (unfinished.length) md.push("## Interrupted or ungraded runs", "", ...unfinished.map((file) => `- [${file}](${file})`), "");
md.push("## Trial evidence", "", ...trials.map(({ evidence, outcome, series }) => `- ${series} · ${outcome} · [${evidence}](${evidence})`), "");
writeFileSync(join(root, "comparison.csv"), csv.join("\n") + "\n");
writeFileSync(join(root, "report.md"), md.join("\n") + "\n");
console.log(join(root, "report.md"));
