import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { writeJSON } from "./artifact.mjs";
import { codexMetrics, jsonLines } from "./codex-events.mjs";
import { controls } from "./mutations.mjs";
import { hash, readJSON } from "./reset.mjs";

const checkpoints = {
  C1: "A newly created project and its URL or identity",
  C2: "The exact prompt submitted by a UI action",
  C3: "Generation completes and shows nonempty relevant source",
  C4: "The Apply/Patch UI action changes the actual editor source",
  C5: "Run opens the calculator in its preview",
  C6: "Real calculator controls produce the exact displayed value 20",
  C7: "The Clear control resets the display",
  C8: "Real calculator controls produce the exact displayed value 42",
};

function readOptional(path) {
  return existsSync(path) ? readJSON(path) : null;
}

function checkSource(path, sha256, testTimeoutMs) {
  const text = readFileSync(path, "utf8");
  const file = ts.createSourceFile("calc.spec.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const issues = [];
  const locatorCalls = {};
  let assertionCount = 0;
  const flag = (node, reason) => issues.push({ reason, line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1 });

  function visit(node) {
    if (ts.isImportDeclaration(node) && (!ts.isStringLiteral(node.moduleSpecifier) || node.moduleSpecifier.text !== "./test-kit")) {
      flag(node, "Import outside the provided test kit");
    }
    if (ts.isCallExpression(node)) {
      const call = node.expression.getText(file);
      const name = call.split(".").at(-1);
      const argument = node.arguments[0];
      const boundedTestTimeout = call === "test.setTimeout" && argument && ts.isNumericLiteral(argument) &&
        Number(argument.text) > 0 && Number(argument.text) <= testTimeoutMs;
      if (/^test\.(?:skip|only|fixme|fail|use|describe\.(?:only|skip|configure))$/.test(call) ||
          (name === "setTimeout" && !boundedTestTimeout) ||
          /^(?:require|fetch|eval|import|Function)$/.test(call) ||
          /^(?:route|routeFromHAR|routeWebSocket|addInitScript|setContent|waitForTimeout|setDefaultTimeout|setExtraHTTPHeaders)$/.test(name)) {
        flag(node, "Forbidden runner override, timing shortcut, direct API, or mock");
      }
      if (name === "expect") {
        assertionCount++;
        if (node.arguments.length > 0 && /^(['"`].*['"`]|\d+|true|false|null|undefined|[\d\s+*/-]+)$/.test(node.arguments[0].getText(file))) {
          flag(node, "Assertion on a constant");
        }
      }
      if (/^(?:getBy[A-Z]\w*|locator|frameLocator|nth|first|last)$/.test(name)) locatorCalls[name] = (locatorCalls[name] ?? 0) + 1;
    }
    if (ts.isPropertyAssignment(node) && node.name.getText(file).replaceAll(/['"]/g, "") === "force" &&
        node.initializer.kind !== ts.SyntaxKind.FalseKeyword) flag(node, "Forced browser action");
    if (ts.isIdentifier(node) && ["process", "globalThis", "XMLHttpRequest"].includes(node.text)) {
      flag(node, "Process, global, or direct API access");
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  const matches = hash(Buffer.from(text)) === sha256;
  if (!matches) issues.push({ reason: "Candidate content does not match the saved hash", line: null });
  if (!assertionCount) issues.push({ reason: "No observed expect assertion", line: null });
  return { bytes: Buffer.byteLength(text), lines: text.trimEnd().split("\n").length, assertionCount, locatorCalls, issues };
}

function testResults(suites) {
  return (suites ?? []).flatMap((suite) => [
    ...(suite.specs ?? []).flatMap((spec) => (spec.tests ?? []).flatMap((test) => test.results ?? [])),
    ...testResults(suite.suites),
  ]);
}

function classifyFailure(result, report) {
  if (!result || result.status === "passed") return null;
  if (result.status === "infrastructure_failure") return "infrastructure";
  if (result.timedOut) return "timeout";
  const entries = testResults(report?.suites);
  const messages = [...(report?.errors ?? []), ...entries.flatMap((item) => item.errors ?? [])]
    .map((error) => error.message ?? "").join("\n");
  if (!entries.length && messages) return "collection";
  if (result.upstream?.some((request) => request.error)) return "application_generation";
  if (/strict mode violation/i.test(messages)) return "locator_ambiguous";
  if (/element\(s\) not found|waiting for locator/i.test(messages)) return "locator_or_sync";
  if (/intercepts pointer events|element is not (?:visible|enabled|stable)/i.test(messages)) return "actionability";
  if (/expect\(.+\)|(?:Expected|Received)(?: string| pattern)?:/i.test(messages)) return "assertion";
  if (/timeout|timed out/i.test(messages)) return "sync_or_timeout";
  return "unknown";
}

function mutationEvidence(dir, path, kind) {
  if (!path) return { killed: null, reason: "Control was not run" };
  const execution = readOptional(join(dir, path));
  const reportPath = join(dirname(path), "playwright.json");
  const report = readOptional(join(dir, reportPath));
  const evidence = { execution: path, report: report ? reportPath : null };
  if (!report || execution?.upstream?.length !== 1 || !execution.upstream[0].completed) {
    return { ...evidence, killed: null, reason: "Control did not reach a healthy generation" };
  }
  if (execution.status === "passed") return { ...evidence, killed: false, reason: "Candidate passed on the altered calculation" };
  const { correct, wrong } = controls[kind];
  for (const result of testResults(report.suites)) {
    for (const error of result.errors ?? []) {
      const message = (error.message ?? "").replace(/\x1b\[[0-9;]*m/g, "");
      const expected = message.match(/^Expected(?: string| pattern)?:\s*([^\n]+)/m)?.[1];
      const received = message.match(/^Received(?: string| value)?:\s*([^\n]+)/m)?.[1];
      const expectedExact = [String(correct), JSON.stringify(String(correct)), `/^${correct}$/`].includes(expected?.trim());
      const receivedExact = [String(wrong), JSON.stringify(String(wrong))].includes(received?.trim());
      if (expectedExact && receivedExact) {
        return { ...evidence, killed: true, expected: correct, observed: wrong, errorLocation: error.location ?? null };
      }
    }
  }
  return { ...evidence, killed: null, reason: "No matching result assertion in the control report" };
}

function pickCheckpoints(review) {
  return Object.fromEntries(Object.entries(checkpoints).map(([id, description]) => {
    const entry = review?.[id];
    const present = ["passed", "failed"].includes(entry?.status) && typeof entry.evidence === "string" && entry.evidence.trim();
    return [id, present ? { status: entry.status, evidence: entry.evidence } : { status: "unverified", description }];
  }));
}

export function gradeTrial(dir) {
  const run = readJSON(join(dir, "run.json"));
  const reviews = readOptional(join(dir, "review.json"));
  const codex = codexMetrics(dir);
  const protocol = [...codex.protocolEvidence];
  const finalProtocol = [];
  if (run.candidates.final && !run.candidates.final.verifiedLaunch) finalProtocol.push({ reason: "Final bytes were not the last launched candidate" });
  if (run.launchLimitExceeded) finalProtocol.push({ reason: "Attempted to exceed the launch limit" });
  const byRole = {};
  for (const [role, candidate] of Object.entries(run.candidates)) {
    if (!candidate) continue;
    const replayPath = run.replays[role];
    const replay = replayPath && readOptional(join(dir, replayPath));
    const reportPath = replayPath && join(dirname(replayPath), "playwright.json");
    const report = reportPath && readOptional(join(dir, reportPath));
    const source = checkSource(join(dir, candidate.file), candidate.sha256, run.budgets.testTimeoutMs);
    const cleanPass = replay?.status === "passed";
    const expectedGeneration = replay?.upstream?.length === 1 && replay.upstream[0].completed === true;
    const checks = pickCheckpoints(reviews?.candidates?.[candidate.sha256]);
    const mutation = Object.fromEntries(Object.keys(controls).map((kind) => [kind, mutationEvidence(dir, run.mutations[role]?.[kind], kind)]));
    const states = Object.values(checks).map(({ status }) => status);
    const roleProtocol = role === "final" ? [...protocol, ...finalProtocol] : protocol;
    const strict = cleanPass && expectedGeneration && !source.issues.length && !roleProtocol.length &&
      states.every((status) => status === "passed") && Object.values(mutation).every(({ killed }) => killed === true);
    const needsReview = cleanPass && expectedGeneration && !source.issues.length && !roleProtocol.length &&
      !states.includes("failed") && states.includes("unverified");
    byRole[role] = {
      candidate, source, replay: replayPath ?? null, report: report ? reportPath : null,
      rawReplayPass: replay && ["passed", "failed", "timed_out"].includes(replay.status) ? cleanPass : null,
      expectedGeneration: expectedGeneration ?? null,
      generationWaitMs: expectedGeneration ? replay.upstream[0].wallMs : null,
      replayDurationMs: replay?.durationMs ?? null,
      failureCategory: classifyFailure(replay, report),
      checkpoints: checks, mutations: mutation, protocol: roleProtocol, strictValidity: strict ? "passed" : needsReview ? "unverified" : "failed",
    };
  }
  const record = {
    schemaVersion: 1, trialId: run.trialId, candidates: byRole, protocol: [...protocol, ...finalProtocol],
    reviewEvidence: reviews ? "review.json" : null,
  };
  writeJSON(join(dir, "grade.json"), record);
  const pending = Object.values(byRole).filter(({ strictValidity }) => strictValidity === "unverified");
  if (pending.length && !existsSync(join(dir, "review.required.json"))) {
    writeJSON(join(dir, "review.required.json"), {
      candidates: Object.fromEntries(pending.map(({ candidate }) => [candidate.sha256, pickCheckpoints()])),
    });
  }
  const launches = run.launches;
  const seen = new Set();
  let unchangedReruns = 0;
  let repairIterations = 0;
  for (const [index, launch] of launches.entries()) {
    if (seen.has(launch.sha256)) unchangedReruns++;
    const prior = launches[index - 1];
    if (prior && ["failed", "timed_out"].includes(prior.status) && prior.sha256 !== launch.sha256) repairIterations++;
    seen.add(launch.sha256);
  }
  const events = jsonLines(join(dir, "tool-events.jsonl")).map(({ data }) => data).filter((data) => data?.type === "browser");
  const first = byRole.first;
  const final = byRole.final;
  const finalAttempt = final && launches.find((launch) => launch.sha256 === final.candidate.sha256);
  const timeToValidTestMs = first?.strictValidity === "passed" ? launches[0].elapsedMs
    : final?.strictValidity === "passed" && finalAttempt && launches.slice(0, launches.indexOf(finalAttempt))
      .every((attempt) => attempt.sha256 === first?.candidate.sha256) ? finalAttempt.elapsedMs : null;
  writeJSON(join(dir, "metrics.json"), {
    schemaVersion: 1, trialId: run.trialId, revision: run.revision, series: run.series, mode: run.mode,
    outcome: run.outcome, firstCandidatePass: first?.strictValidity === "passed", finalCandidatePass: final?.strictValidity === "passed",
    taskSuccess: final?.strictValidity === "passed", firstValidity: first?.strictValidity ?? "no_candidate",
    finalValidity: final?.strictValidity ?? "no_candidate", rawFirstReplayPass: first?.rawReplayPass ?? null,
    rawFinalReplayPass: final?.rawReplayPass ?? null,
    agentWallMs: run.agent?.wallMs ?? null, timeToFirstCandidateMs: launches[0]?.elapsedMs ?? null, timeToValidTestMs,
    testLaunches: launches.length, repairIterations, unchangedReruns, runnerRetries: launches.length ? 0 : null,
    agentFirstRunStatus: launches[0]?.status ?? null, failedAgentLaunches: launches.filter(({ status }) => status !== "passed").length,
    agentExitCode: run.agent?.exitCode ?? null, agentTimedOut: run.agent?.timedOut ?? null, protocolViolation: record.protocol.length > 0,
    replayDurationMs: Object.values(byRole).some(({ replayDurationMs }) => replayDurationMs !== null)
      ? Object.values(byRole).reduce((total, item) => total + (item.replayDurationMs ?? 0), 0) : null,
    addMutationKilled: final?.mutations.add.killed ?? null, multiplyMutationKilled: final?.mutations.multiply.killed ?? null,
    generationWaitMs: final?.generationWaitMs ?? null, generationWaitSource: final?.generationWaitMs == null ? null : "final replay upstream",
    generationInputTokens: null, generationOutputTokens: null,
    discoveryCalls: run.agent ? events.length : null,
    discoveryFailures: run.agent ? events.filter(({ ok }) => !ok).length : null,
    snapshotCalls: run.agent ? events.filter(({ command }) => command === "snapshot").length : null,
    screenshotCalls: run.agent ? events.filter(({ command }) => command === "screenshot").length : null,
    domReadCalls: run.agent ? events.filter(({ command }) => ["dom", "text"].includes(command)).length : null,
    browserActionCalls: run.agent ? events.filter(({ command }) => ["click", "fill", "press", "goto"].includes(command)).length : null,
    discoveryResponseBytes: run.agent ? events.reduce((sum, event) => sum + (event.responseBytes ?? 0), 0) : null,
    failureCategories: Object.values(byRole).map(({ failureCategory }) => failureCategory).filter(Boolean),
    infrastructureFailure: run.outcome === "infrastructure_failure" || Object.values(byRole).some(({ failureCategory }) => failureCategory === "infrastructure"),
    ...codex,
  });
  return record;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error("Usage: npm run agent:grade -- <trial-directory>");
  const dir = resolve(process.argv[2]);
  gradeTrial(dir);
  console.log(join(dir, "grade.json"));
}
