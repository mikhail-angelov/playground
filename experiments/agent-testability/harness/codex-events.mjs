import { cpSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export const parserVersion = 1;
const keys = ["input_tokens", "cached_input_tokens", "output_tokens"];

export function jsonLines(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").flatMap((line, index) => {
    if (!line.trim()) return [];
    try {
      return [{ line: index + 1, data: JSON.parse(line) }];
    } catch {
      return [{ line: index + 1, data: null }];
    }
  });
}

export function captureRollout(codexHome, runDir) {
  const thread = jsonLines(join(runDir, "codex.jsonl")).find(({ data }) => data?.type === "thread.started")?.data.thread_id;
  const sessions = join(codexHome, "sessions");
  if (!thread || !existsSync(sessions)) return null;
  const files = readdirSync(sessions, { recursive: true }).filter((file) => file.endsWith(`-${thread}.jsonl`));
  if (files.length !== 1) return null;
  const source = join(sessions, files[0]);
  if (!jsonLines(source).some(({ data }) => data?.type === "session_meta" && data.payload?.id === thread)) return null;
  const destination = join(runDir, "codex.rollout.jsonl");
  cpSync(source, destination);
  return relative(runDir, destination);
}

export function codexMetrics(dir) {
  const cli = jsonLines(join(dir, "codex.jsonl"));
  const rollout = jsonLines(join(dir, "codex.rollout.jsonl"));
  const turns = cli.filter(({ data }) => data?.type === "turn.completed");
  const fromCLI = turns.length === 1 ? turns[0].data.usage : null;
  const records = [];
  const byResponse = new Map();
  let conflicts = false;
  for (const { data, line } of rollout) {
    if (data?.type !== "token_usage_record") continue;
    const { response_id: id, usage } = data.payload ?? {};
    if (typeof id !== "string" || !id) continue;
    records.push({ responseId: id, usage, line });
    if (byResponse.has(id)) {
      if (keys.some((key) => byResponse.get(id)?.[key] !== usage?.[key])) conflicts = true;
    } else {
      byResponse.set(id, usage);
    }
  }
  const usage = Object.fromEntries(keys.map((key) => [
    key, Number.isSafeInteger(fromCLI?.[key]) && fromCLI[key] >= 0 ? fromCLI[key] : null,
  ]));
  const responseCoverage = byResponse.size ? Object.fromEntries(keys.map((key) => {
    const values = [...byResponse.values()].map((entry) => entry?.[key]);
    return [key, !conflicts && values.every((value) => Number.isSafeInteger(value) && value >= 0)
      ? values.reduce((sum, value) => sum + value, 0) : null];
  })) : null;
  const usageSource = fromCLI ? "codex.jsonl turn.completed.usage" : null;
  const responseUsageMatches = responseCoverage && keys.every((key) => usage[key] !== null && responseCoverage[key] !== null)
    ? keys.every((key) => usage[key] === responseCoverage[key]) : null;

  const completed = cli.filter(({ data }) => data?.type === "item.completed");
  const commands = completed.filter(({ data }) => data.item?.type === "command_execution");
  const bypass = commands.filter(({ data }) => /\b(?:npx|npm exec|pnpm exec|yarn)\s+(?:@playwright\/test|playwright)\b|(?:\bplaywright\s+test\b|\bnpm\s+test\b)/.test(data.item.command ?? ""));
  return {
    parserVersion,
    turnsStarted: cli.filter(({ data }) => data?.type === "turn.started").length || null,
    turnsCompleted: turns.length,
    inputTokens: usage.input_tokens,
    cachedInputTokens: usage.cached_input_tokens,
    outputTokens: usage.output_tokens,
    uncachedInputTokens: usage.input_tokens !== null && usage.cached_input_tokens !== null && usage.cached_input_tokens <= usage.input_tokens
      ? usage.input_tokens - usage.cached_input_tokens : null,
    usageSource,
    usageCoverage: keys.every((key) => usage[key] !== null) ? "complete" : keys.some((key) => usage[key] !== null) ? "partial" : "unobserved",
    rawUsage: turns.map(({ data, line }) => ({ line, usage: data.usage ?? null })),
    llmResponsesObserved: byResponse.size || null,
    llmResponseEvidence: records,
    responseUsageSum: responseCoverage,
    responseUsageMatches,
    commandExecutions: cli.some(({ data }) => data?.type === "thread.started") ? commands.length : null,
    protocolEvidence: bypass.map(({ line, data }) => ({ line, command: data.item.command })),
    invalidJsonlLines: cli.filter(({ data }) => data === null).map(({ line }) => line),
  };
}
