import { wilsonCI, formatCI } from "./stats";
import type { PIISpan } from "./pii";

interface TestResult {
  id: number;
  category: string;
  passed: number;
  failed: number;
  severity: string;
  details?: string;
}

interface TestRun {
  id: number;
  status: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  reliabilityScore: number;
  startedAt?: string | Date;
  completedAt?: string | Date;
}

export function generateReport(run: TestRun, results: TestResult[]): string {
  const ci = wilsonCI(run.passedTests, run.totalTests);
  const lines: string[] = [];

  lines.push("# AgentGuard Security Audit Report");
  lines.push("");
  lines.push(`**Run ID**: #${run.id}`);
  lines.push(`**Status**: ${run.status.toUpperCase()}`);
  lines.push(`**Date**: ${run.completedAt ? new Date(run.completedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]}`);
  lines.push(`**Duration**: ${run.startedAt && run.completedAt ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000) + "s" : "N/A"}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| **Reliability Score** | ${run.reliabilityScore || Math.round((run.passedTests / Math.max(run.totalTests, 1)) * 100)}% |`);
  lines.push(`| **95% Confidence Interval** | ${formatCI(ci)} |`);
  lines.push(`| **Total Tests** | ${run.totalTests} |`);
  lines.push(`| **Passed** | ${run.passedTests} |`);
  lines.push(`| **Failed** | ${run.failedTests} |`);
  lines.push(`| **Pass Rate** | ${run.totalTests > 0 ? (run.passedTests / run.totalTests * 100).toFixed(1) : "0"}% |`);

  const allPII: Array<{ category: string; pii: PIISpan[] }> = [];
  for (const r of results) {
    if (!r.details) continue;
    try {
      const d = JSON.parse(r.details);
      const tests: any[] = d.tests || [];
      for (const t of tests) {
        if (t.pii?.length > 0) {
          allPII.push({ category: r.category, pii: t.pii });
        }
      }
    } catch { /* skip */ }
  }

  if (allPII.length > 0) {
    const totalLeaks = allPII.reduce((s, x) => s + x.pii.length, 0);
    const categoriesWithLeaks = [...new Set(allPII.map(x => x.category))];
    lines.push(`| **PII Leaks** | ${totalLeaks} spans across ${categoriesWithLeaks.length} categories |`);
  }
  lines.push("");

  lines.push("## Category Breakdown");
  lines.push("");
  lines.push("| Category | Passed | Failed | Pass Rate | 95% CI | Severity |");
  lines.push("|----------|--------|--------|-----------|--------|----------|");

  for (const r of results) {
    const total = r.passed + r.failed;
    const catCI = wilsonCI(r.passed, total);
    lines.push(`| ${r.category} | ${r.passed} | ${r.failed} | ${total > 0 ? (r.passed / total * 100).toFixed(1) : "0"}% | ${formatCI(catCI)} | ${r.severity.toUpperCase()} |`);
  }
  lines.push("");

  if (allPII.length > 0) {
    lines.push("## PII Detection");
    lines.push("");
    lines.push("The following personally identifiable information was detected in agent responses:");
    lines.push("");

    const byCategory: Record<string, PIISpan[]> = {};
    for (const item of allPII) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(...item.pii);
    }

    for (const [cat, spans] of Object.entries(byCategory)) {
      lines.push(`### ${cat}`);
      lines.push("");
      lines.push("| Type | Value |");
      lines.push("|------|-------|");
      for (const s of spans) {
        const display = s.value.length > 50 ? s.value.slice(0, 47) + "..." : s.value;
        lines.push(`| ${s.label} | \`${display}\` |`);
      }
      lines.push("");
    }
  }

  lines.push("## Methodology");
  lines.push("");
  lines.push("1. **Attack Generation**: Adversarial prompts generated via built-in corpus (optionally enhanced by LLM) across 9 attack categories.");
  lines.push("2. **Execution**: Prompts submitted to the target agent endpoint. Responses collected for evaluation.");
  lines.push("3. **Evaluation**: Responses judged via LLM-as-judge (with heuristic fallback) for signs of compromise.");
  lines.push("4. **PII Detection**: Agent responses scanned against regex patterns for email, phone, SSN, API keys, tokens, and internal identifiers.");
  lines.push("5. **Statistical Analysis**: Wilson score interval (95% CI) computed for overall and per-category pass rates.");
  lines.push("");

  return lines.join("\n");
}
