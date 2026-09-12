// CLI modes and the read-only guarantees of verify/replay. Uses a sandbox
// agent root carrying a copy of the committed M0 traces plus a sandbox results
// root, so committed artifacts are never touched (same convention as
// benchmarks/m0/m0-table.test.ts: skip when the traces are absent).
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  EXPERIMENT_ID,
  replaySlice,
  runSlice,
  TRACES_PATH,
  verifySlice,
} from "./experiments/destructive-command-relay.js";
import { parseArgs } from "./run.js";

const agentRoot = process.cwd();
const hasTraces = existsSync(join(agentRoot, TRACES_PATH));
const suite = hasTraces ? describe : describe.skip;

function snapshot(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const abs = join(d, f);
      out.push(`${abs.slice(dir.length)}:${statSync(abs).isDirectory() ? "dir" : readFileSync(abs, "utf8")}`);
      if (statSync(abs).isDirectory()) walk(abs);
    }
  };
  walk(dir);
  return out.sort();
}

describe("parseArgs", () => {
  it("defaults to generate", () => {
    expect(parseArgs([])).toEqual({ mode: "generate", faults: false, replayMode: "artifact_replay" });
  });

  it("parses modes and flags", () => {
    expect(parseArgs(["--mode=verify"]).mode).toBe("verify");
    expect(parseArgs(["replay"]).mode).toBe("replay");
    expect(parseArgs(["--faults"]).faults).toBe(true);
    expect(parseArgs(["replay", "--replay-mode=interaction_replay"]).replayMode).toBe("interaction_replay");
  });

  it("rejects invalid combinations", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/UNKNOWN_ARG/);
    expect(() => parseArgs(["verify", "--faults"])).toThrow(/INVALID_ARGS/);
    expect(() => parseArgs(["generate", "--replay-mode=interaction_replay"])).toThrow(/INVALID_ARGS/);
  });
});

suite("verify and replay modes", () => {
  let sandboxAgent: string;
  let resultsRoot: string;

  beforeAll(() => {
    sandboxAgent = mkdtempSync(join(tmpdir(), "lab-modes-agent-"));
    resultsRoot = mkdtempSync(join(tmpdir(), "lab-modes-results-"));
    mkdirSync(join(sandboxAgent, "results", "m0"), { recursive: true });
    writeFileSync(join(sandboxAgent, TRACES_PATH), readFileSync(join(agentRoot, TRACES_PATH), "utf8"));
    runSlice(sandboxAgent, resultsRoot);
  }, 120_000);

  it("verify passes on a fresh generate and writes nothing", () => {
    const before = snapshot(resultsRoot);
    const outcome = verifySlice(sandboxAgent, resultsRoot);
    expect(outcome.failures).toEqual([]);
    expect(outcome.ok).toBe(true);
    expect(snapshot(resultsRoot)).toEqual(before);
  });

  it("replay passes on committed bundles and writes nothing", () => {
    const before = snapshot(resultsRoot);
    const outcome = replaySlice(sandboxAgent, resultsRoot, "ARTIFACT_REPLAY");
    expect(outcome.failures).toEqual([]);
    expect(outcome.verified).toBeGreaterThan(0);
    expect(snapshot(resultsRoot)).toEqual(before);
  });

  it("interaction replay fails clearly without writing", () => {
    const before = snapshot(resultsRoot);
    const outcome = replaySlice(sandboxAgent, resultsRoot, "INTERACTION_REPLAY");
    expect(outcome.verified).toBe(0);
    expect(outcome.failures.join("\n")).toMatch(/UNSUPPORTED_REPLAY_MODE/);
    expect(snapshot(resultsRoot)).toEqual(before);
  });

  it("a tampered committed bundle fails verification and is left untouched", () => {
    const dir = join(resultsRoot, EXPERIMENT_ID);
    const file = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "agreement.json" && f !== "model-verdicts.json")[0];
    const abs = join(dir, file);
    // Verdict-preserving tamper: flip a field the oracle never reads.
    const tampered = JSON.parse(readFileSync(abs, "utf8"));
    const obs = tampered.observations as Record<string, unknown>;
    tampered.observations = { ...obs, agent_complied: !obs.agent_complied };
    const tamperedBytes = JSON.stringify(tampered, null, 2) + "\n";
    writeFileSync(abs, tamperedBytes);
    const outcome = verifySlice(sandboxAgent, resultsRoot);
    expect(outcome.ok).toBe(false);
    // The envelope check fires first; lineage would fire next. Either way the
    // tamper is caught and nothing is overwritten.
    expect(outcome.failures.join("\n")).toMatch(/BUNDLE_ID_MISMATCH|LINEAGE_MISMATCH/);
    expect(readFileSync(abs, "utf8")).toBe(tamperedBytes);
  });

  it("trace-file drift under intact bundles fails lineage without touching them", () => {
    // Fresh sandbox: the earlier tamper test leaves its own tree behind.
    const agent2 = mkdtempSync(join(tmpdir(), "lab-modes-agent2-"));
    const results2 = mkdtempSync(join(tmpdir(), "lab-modes-results2-"));
    mkdirSync(join(agent2, "results", "m0"), { recursive: true });
    writeFileSync(join(agent2, TRACES_PATH), readFileSync(join(agentRoot, TRACES_PATH), "utf8"));
    runSlice(agent2, results2);
    const traceFile = join(agent2, TRACES_PATH);
    const lines = readFileSync(traceFile, "utf8").split("\n");
    const idx = lines.findIndex((l) => l.includes("\"family\":\"destructive-command-relay\""));
    const record = JSON.parse(lines[idx]);
    record.agent_complied = !record.agent_complied;
    lines[idx] = JSON.stringify(record);
    writeFileSync(traceFile, lines.join("\n"));
    const expDir2 = join(results2, EXPERIMENT_ID);
    const caseFile = readdirSync(expDir2).filter((f) => f.endsWith(".json") && f !== "agreement.json" && f !== "model-verdicts.json")[0];
    const bundleBefore = readFileSync(join(expDir2, caseFile), "utf8");
    const outcome = verifySlice(agent2, results2);
    expect(outcome.ok).toBe(false);
    expect(outcome.failures.join("\n")).toMatch(/LINEAGE_MISMATCH/);
    // Bundles untouched by verification.
    expect(readFileSync(join(expDir2, caseFile), "utf8")).toBe(bundleBefore);
  }, 120_000);
});
