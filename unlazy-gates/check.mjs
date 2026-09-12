// Unlazy gate dispatcher for the add-agentguard-lab evidence-validation fixes.
// Shell-free: node:child_process cannot spawn a shell in this environment, so
// every oracle runs via execFile with explicit argv (no shell quoting, no
// PATH lookup). Usage: node unlazy-gates/check.mjs G1
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const NODE = process.execPath;
const VITEST = join(ROOT, "node_modules", "vitest", "vitest.mjs");
const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");

const vitest = (...files) => [NODE, [VITEST, "run", ...files]];
const tsx = (...args) => [NODE, [TSX, ...args]];

const GATES = {
  G1: [vitest("lab/bundle.test.ts")],
  G2: [vitest("lab/experiments/destructive-command-relay.test.ts")],
  G3: [vitest("lab/replay.test.ts")],
  G4: [vitest("lab/run-modes.test.ts")],
  G5: [vitest("lab/bundle.test.ts")],
  G6: [vitest("lab/agreement.test.ts")],
  G7: [vitest("lab/faults.test.ts")],
  G8: [vitest("lab/report.drift.test.ts", "lab/bundle-drift.test.ts")],
  G9: [vitest("lab/report.test.ts")],
  // NOTE: openspec has no shell-free entry point here (openspec.cmd needs
  // cmd.exe, which this environment cannot spawn). The strict-validation
  // oracle for G10 runs separately via the approved shell; see EVIDENCE.
  G10: [
    [NODE, [join(ROOT, "unlazy-gates", "lab-typecheck.mjs")]],
    vitest("lab"),
    tsx("lab/run.ts", "--mode=verify"),
    tsx("lab/run.ts", "--mode=replay"),
  ],
};

const id = process.argv[2];
if (!GATES[id]) {
  console.error(`unknown gate ${id}`);
  process.exit(2);
}
for (const [file, args] of GATES[id]) {
  execFileSync(file, args, { cwd: ROOT, stdio: "inherit", timeout: 600000 });
}
console.log(`GATE ${id} PASSED`);
