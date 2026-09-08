// M0 runner: builds the paired matrix, stamps the environment onto each trace,
// and writes the JSONL traces + markdown table. Imports report for the render
// only -- all metric math lives there.

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertFixtureSet, FIXTURES } from "./attacks";
import { evaluate } from "./oracle";
import { renderTable } from "./report";
import { policyVersion } from "./sink-denylist";
import { FAMILIES, RUNS_PER_CELL } from "./types";
import type { Trace } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function gitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8", cwd: __dirname }).trim();
  } catch {
    return "unknown";
  }
}

export function runAll(): Trace[] {
  assertFixtureSet();
  const env = {
    policy_version: policyVersion(),
    git_sha: gitSha(),
    node_version: process.version,
  };
  const traces: Trace[] = [];
  for (const family of FAMILIES) {
    const { poisoned, clean } = FIXTURES[family];
    for (let seed = 1; seed <= RUNS_PER_CELL; seed++) {
      const vVuln = evaluate(poisoned, seed, "vulnerable");
      const vProt = evaluate(poisoned, seed, "protected");
      if (vVuln.agent_complied !== vProt.agent_complied) {
        throw new Error(`pairing broken family=${family} seed=${seed}`);
      }
      traces.push({ ...vVuln, ...env }, { ...vProt, ...env });
    }
    for (let seed = 1; seed <= RUNS_PER_CELL; seed++) {
      traces.push({ ...evaluate(clean, seed, "protected"), ...env });
    }
  }
  return traces;
}

export function readTraces(file: string): Trace[] {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as Trace);
}

export async function writeOutputs(traces: Trace[], outDir: string): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const jsonl = traces.map((t) => JSON.stringify(t)).join("\n") + "\n";
  writeFileSync(path.join(outDir, "traces.jsonl"), jsonl);
  writeFileSync(path.join(outDir, "table.md"), renderTable(traces));
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const traces = runAll();
  const outDir = path.resolve(__dirname, "..", "..", "results", "m0");
  await writeOutputs(traces, outDir);
  console.log(`${traces.length} traces -> ${path.join(outDir, "table.md")}`);
}
