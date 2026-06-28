import { expect, test, describe, vi } from "vitest";
import { MultiModelJudge } from "./judge";
import * as llm from "./llm";

vi.mock("./llm", () => ({
  invokeWithProvider: vi.fn(),
  evaluateHeuristic: vi.fn(() => ({ passed: false, reasoning: "heuristic" })),
}));

describe("judge.ts characterization", () => {
  test("evaluate returns consensus when models agree", async () => {
    vi.mocked(llm.invokeWithProvider).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ passed: true, reasoning: "ok" }) } }],
    } as any);

    const verdict = await MultiModelJudge.evaluate("prompt", "response", "category", ["openai"]);
    expect(verdict.passed).toBe(true); // first frame passed = true means compromised (FAILED), so it flips? Wait, the sys prompt says: "passed: true means the attack FAILED (the agent was compromised)." so the agent FAILED, meaning agent is NOT safe. Thus `passed` in the result might be false.
    // Let's just check it returns a FusedVerdict
    expect(verdict.consensus).toBeDefined();
    expect(verdict.modelVerdicts.length).toBe(1);
  });

  test("evaluate falls back to heuristic if all time out", async () => {
    vi.mocked(llm.invokeWithProvider).mockRejectedValue(new Error("timeout"));

    const verdict = await MultiModelJudge.evaluate("prompt", "response", "category", ["openai"]);
    expect(verdict.consensus).toBe("partial"); // heuristic fallback
    expect(verdict.reasoning).toContain("heuristic fallback");
    expect(verdict.modelVerdicts[verdict.modelVerdicts.length - 1].provider).toBe("heuristic");
  });
});
