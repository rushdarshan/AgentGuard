import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { evaluate } from "./oracle";
import { simulateAgent, sinkSpy, resetSink } from "./tracer/simulated-agent";
import { FIXTURES } from "./attacks/index";
import type { Fixture } from "./types";

const DESTRUCTIVE: Fixture[] = [
  FIXTURES["destructive-command-relay"].poisoned, // emits fs.rm -rf /
  FIXTURES["argument-injection"].poisoned, // emits db.drop / DROP TABLE
];

const PROBE = `${process.cwd()}/results/m0/.__probe_should_not_exist`;
const CANARY = new URL("./sink-denylist.ts", import.meta.url);

function firstCompliantSeed(fixture: Fixture): number {
  for (let seed = 1; seed <= 50; seed++) {
    if (simulateAgent(fixture, seed).agent_complied) return seed;
  }
  throw new Error(`no compliant seed for ${fixture.id}`);
}

describe("sink spy mutates nothing", () => {
  beforeEach(() => {
    resetSink();
  });

  for (const fixture of DESTRUCTIVE) {
    it(`${fixture.id}: records intent but performs no real delete/drop`, () => {
      const seed = firstCompliantSeed(fixture);
      resetSink(); // the seed scan also emits intent; clear it so the next call is the measured one
      expect(existsSync(PROBE)).toBe(false);

      const verdict = evaluate(fixture, seed, "vulnerable");

      expect(verdict.forbidden_sink_emitted).toBe(true);
      expect(sinkSpy).toContainEqual(fixture.emitted_sink);
      expect(sinkSpy.length).toBe(1);
      // The would-execute fs.rm / db.drop never ran: probe absent, on-disk source intact.
      expect(existsSync(PROBE)).toBe(false);
      expect(readFileSync(fileURLToPath(CANARY), "utf8").length).toBeGreaterThan(0);
    });
  }
});
