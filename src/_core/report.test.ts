import { expect, test, describe } from "vitest";
import { generateReport, generateReportHtml, validateReport } from "./report";

const mockRun = {
  id: 1,
  status: "completed",
  totalTests: 10,
  passedTests: 8,
  failedTests: 2,
  reliabilityScore: 80,
  startedAt: new Date("2026-01-01T00:00:00Z"),
  completedAt: new Date("2026-01-01T00:01:00Z"),
};

const mockResults = [
  { id: 1, category: "Jailbreak", passed: 5, failed: 3, severity: "high" },
  { id: 2, category: "PII Leak", passed: 3, failed: 1, severity: "critical" },
];

describe("validateReport", () => {
  test("valid report passes", () => {
    const result = validateReport({
      runId: 1,
      status: "completed",
      reliabilityScore: 80,
      categories: [
        { category: "Jailbreak", passed: 5, failed: 3, severity: "high" },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test("missing runId fails", () => {
    const result = validateReport({ status: "completed", reliabilityScore: 80, categories: [] });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("runId");
  });

  test("invalid status fails", () => {
    const result = validateReport({ runId: 1, status: "running", reliabilityScore: 80, categories: [] });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("status");
  });

  test("invalid reliabilityScore fails", () => {
    const result = validateReport({ runId: 1, status: "completed", reliabilityScore: 150, categories: [] });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("reliabilityScore");
  });

  test("invalid severity fails", () => {
    const result = validateReport({
      runId: 1, status: "completed", reliabilityScore: 80,
      categories: [{ category: "X", passed: 0, failed: 0, severity: "extreme" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("severity");
  });

  test("non-object input fails", () => {
    expect(validateReport(null).valid).toBe(false);
    expect(validateReport("string").valid).toBe(false);
  });
});

describe("generateReport", () => {
  test("generates markdown with run metadata", () => {
    const md = generateReport(mockRun, mockResults);
    expect(md).toContain("# AgentGuard Security Audit Report");
    expect(md).toContain("**Run ID**: #1");
    expect(md).toContain("**Status**: COMPLETED");
  });

  test("includes summary table", () => {
    const md = generateReport(mockRun, mockResults);
    expect(md).toContain("## Summary");
    expect(md).toContain("Agent Readiness Score");
    expect(md).toContain("Confidence Interval");
  });

  test("includes OWASP mapping", () => {
    const md = generateReport(mockRun, mockResults);
    expect(md).toContain("## OWASP LLM / MITRE ATLAS Mapping");
    expect(md).toContain("Jailbreak");
  });

  test("includes category breakdown", () => {
    const md = generateReport(mockRun, mockResults);
    expect(md).toContain("## Category Breakdown");
    expect(md).toContain("| Jailbreak |");
  });

  test("includes remediations for failures", () => {
    const md = generateReport(mockRun, mockResults);
    expect(md).toContain("## Remediations");
    expect(md).toContain("role-locking");
  });

  test("handles zero tests", () => {
    const md = generateReport({ ...mockRun, totalTests: 0, passedTests: 0, failedTests: 0 }, []);
    expect(md).toContain("## Summary");
  });
});

describe("generateReportHtml", () => {
  test("generates valid HTML", () => {
    const html = generateReportHtml(mockRun, mockResults);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
    expect(html).toContain("AgentGuard Audit Report #1");
  });

  test("includes composite scores", () => {
    const html = generateReportHtml(mockRun, mockResults);
    expect(html).toContain("Composite");
    expect(html).toContain("Grade");
  });

  test("includes remediations section when failures exist", () => {
    const html = generateReportHtml(mockRun, mockResults);
    expect(html).toContain("Remediations");
  });
});
