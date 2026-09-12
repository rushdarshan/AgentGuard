// Lab CLI. Modes:
//   generate (default)  write/replace canonical slice artifacts + REPORT.md
//   generate --faults   additionally write fault-demonstration bundles
//   verify              read-only: re-verify committed bundles, agreement,
//                       fixtures, and report; exit nonzero on any drift
//   replay              read-only: re-score committed bundles under
//                       ARTIFACT_REPLAY; --replay-mode interaction_replay fails
//                       with UNSUPPORTED_REPLAY_MODE
// Verify and replay write nothing.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listExperimentBundles } from "./bundle.js";
import {
  EXPERIMENT_ID,
  FAULT_DEMO_EXPERIMENT_ID,
  flipOracleOutcome,
  replaySlice,
  rescore,
  runSlice,
  verifySlice,
} from "./experiments/destructive-command-relay.js";
import { demonstrateFaults } from "./faults.js";
import { renderReport } from "./report.js";

export interface CliArgs {
  mode: "generate" | "verify" | "replay";
  faults: boolean;
  replayMode: "artifact_replay" | "interaction_replay";
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { mode: "generate", faults: false, replayMode: "artifact_replay" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mode") {
      const mode = argv[++i];
      if (mode !== "generate" && mode !== "verify" && mode !== "replay") {
        throw new Error(`UNKNOWN_ARG: --mode ${String(mode)}`);
      }
      args.mode = mode;
      continue;
    }
    if (a === "--mode=generate" || a === "generate") args.mode = "generate";
    else if (a === "--mode=verify" || a === "verify") args.mode = "verify";
    else if (a === "--mode=replay" || a === "replay") args.mode = "replay";
    else if (a === "--faults") args.faults = true;
    else if (a === "--replay-mode=interaction_replay") args.replayMode = "interaction_replay";
    else if (a === "--replay-mode=artifact_replay") args.replayMode = "artifact_replay";
    else throw new Error(`UNKNOWN_ARG: ${a} (expected --mode=generate|verify|replay, --faults, --replay-mode=...)`);
  }
  if (args.mode !== "generate" && args.faults) throw new Error("INVALID_ARGS: --faults applies to generate only");
  if (args.mode !== "replay" && args.replayMode !== "artifact_replay") {
    throw new Error("INVALID_ARGS: --replay-mode applies to replay only");
  }
  return args;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const agentRoot = process.cwd();
  const resultsRoot = join(agentRoot, "results", "lab");

  if (args.mode === "verify") {
    const outcome = verifySlice(agentRoot, resultsRoot);
    // The report must also match what the committed bundles regenerate to.
    const bundles = listExperimentBundles(resultsRoot, EXPERIMENT_ID);
    const committedReport = readFileSync(join(resultsRoot, "REPORT.md"), "utf8");
    const rendered = renderReportFromCommitted(agentRoot, resultsRoot);
    if (rendered !== committedReport) outcome.failures.push("REPORT.md diverges from committed bundles");
    const ok = outcome.failures.length === 0;
    if (!ok) {
      for (const f of outcome.failures) console.error(`VERIFY_FAIL: ${f}`);
      process.exitCode = 1;
      return;
    }
    console.log(`verify ok: ${bundles.length} bundles, agreement, fixtures, and REPORT.md all match`);
    return;
  }

  if (args.mode === "replay") {
    if (args.replayMode === "interaction_replay") {
      console.error("UNSUPPORTED_REPLAY_MODE: INTERACTION_REPLAY is deferred to a follow-on change");
      process.exitCode = 1;
      return;
    }
    const outcome = replaySlice(agentRoot, resultsRoot, "ARTIFACT_REPLAY");
    if (outcome.failures.length > 0) {
      for (const f of outcome.failures) console.error(`REPLAY_FAIL: ${f}`);
      process.exitCode = 1;
      return;
    }
    console.log(`replay ok: ${outcome.verified}/${outcome.verified} committed bundles re-scored identically`);
    return;
  }

  // generate
  const summary = runSlice(agentRoot, resultsRoot);
  if (args.faults) {
    const base = summary.executions[0];
    // The mutation the slice rescorer genuinely depends on: flipping the
    // recorded oracle outcome changes the re-scored verdict, so the replay
    // comparison really detects the divergence (no stub rescorer).
    demonstrateFaults(base, resultsRoot, FAULT_DEMO_EXPERIMENT_ID, { rescore }, flipOracleOutcome);
  }
  const report = renderReportFromCommitted(agentRoot, resultsRoot);
  writeFileSync(join(resultsRoot, "REPORT.md"), report);
  console.log(`generate ok: ${summary.cases} cases, replay ${summary.replayVerified}/${summary.cases} OK`);
  if (summary.replayFailures.length > 0) {
    for (const f of summary.replayFailures) console.error(`REPLAY_FAIL: ${f}`);
    process.exitCode = 1;
  }
}

export function renderReportFromCommitted(agentRoot: string, resultsRoot: string): string {
  const executions = listExperimentBundles(resultsRoot, EXPERIMENT_ID);
  const demos = listExperimentBundles(resultsRoot, FAULT_DEMO_EXPERIMENT_ID);
  const replay = replaySlice(agentRoot, resultsRoot, "ARTIFACT_REPLAY");
  return renderReport({ executions, demos, replay: { verified: replay.verified, failures: replay.failures } });
}

const invokedAsScript = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("lab/run.ts");
if (invokedAsScript) main();
