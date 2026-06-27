import { readFileSync, existsSync } from "fs";
import { join } from "path";
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

const OWASP_MAP: Record<string, { llm: string; agentic: string; atlas: string }> = {
  "Prompt Injection":              { llm: "LLM01", agentic: "ASI01", atlas: "ML-0017" },
  "Indirect Prompt Injection":     { llm: "LLM02", agentic: "ASI02", atlas: "ML-0017" },
  "Multi-turn Crescendo":          { llm: "LLM01", agentic: "ASI01", atlas: "ML-0017" },
  "Jailbreak":                     { llm: "LLM01", agentic: "ASI01", atlas: "ML-0017" },
  "Context Overflow":              { llm: "LLM04", agentic: "—",     atlas: "ML-0025" },
  "Hallucination":                 { llm: "LLM09", agentic: "—",     atlas: "ML-0020" },
  "Schema Drift":                  { llm: "LLM02", agentic: "ASI06", atlas: "ML-0027" },
  "Logic Collapse":                { llm: "LLM09", agentic: "—",     atlas: "—" },
  "Multi-tenant Context Leak":     { llm: "LLM06", agentic: "ASI03", atlas: "ML-0026" },
  "Memory Poisoning":              { llm: "LLM02", agentic: "ASI04", atlas: "ML-0017" },
};

const REMEDIATIONS: Record<string, string> = {
  "Prompt Injection":              "Implement input sanitization, instruction hierarchy, and system prompt boundaries. Use delimiter-based separation of instructions and data.",
  "Indirect Prompt Injection":     "Validate and sanitize external content before ingestion. Use content safety classifiers on retrieved documents and web pages.",
  "Multi-turn Crescendo":          "Track conversation context and enforce consistent safety boundaries across turns. Reset safety state after each turn boundary.",
  "Jailbreak":                     "Apply robust refusal training, role-locking, and adversarial training data. Use output classifiers to detect jailbreak patterns.",
  "Context Overflow":              "Implement token budget monitoring with early warning. Truncate inputs with priority retention of safety instructions.",
  "Hallucination":                 "Ground responses in verified sources. Use retrieval-augmented generation with citation requirements. Apply factual consistency checks.",
  "Schema Drift":                  "Validate all input formats against a strict schema. Reject malformed payloads before processing.",
  "Logic Collapse":               "Add logical consistency checks. Train on adversarial paradoxical examples. Detect self-contradictory chains.",
  "Multi-tenant Context Leak":     "Isolate per-user context strictly. Never allow cross-tenant data access. Use tenant ID as a mandatory filter parameter.",
  "Memory Poisoning":              "Sanitize and validate all external data before writing to agent memory. Implement memory content scanning and anomaly detection. Use read-only memory for system-provided context.",
};

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
  lines.push(`| **Agent Readiness Score** | ${run.reliabilityScore || Math.round((run.passedTests / Math.max(run.totalTests, 1)) * 100)}% |`);
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

  lines.push("## OWASP LLM / MITRE ATLAS Mapping");
  lines.push("");
  lines.push("| Category | OWASP LLM | OWASP Agentic | MITRE ATLAS |");
  lines.push("|----------|-----------|---------------|-------------|");
  for (const r of results) {
    const m = OWASP_MAP[r.category];
    if (m) lines.push(`| ${r.category} | ${m.llm} | ${m.agentic} | ${m.atlas} |`);
  }
  lines.push("");

  lines.push("## Category Breakdown");
  lines.push("");
  lines.push("| Category | Passed | Failed | Pass Rate | 95% CI | Severity | OWASP |");
  lines.push("|----------|--------|--------|-----------|--------|----------|-------|");

  for (const r of results) {
    const total = r.passed + r.failed;
    const catCI = wilsonCI(r.passed, total);
    const m = OWASP_MAP[r.category];
    const owaspRef = m ? m.llm : "—";
    lines.push(`| ${r.category} | ${r.passed} | ${r.failed} | ${total > 0 ? (r.passed / total * 100).toFixed(1) : "0"}% | ${formatCI(catCI)} | ${r.severity.toUpperCase()} | ${owaspRef} |`);
  }
  lines.push("");

  lines.push("## Remediations");
  lines.push("");
  for (const r of results) {
    if (r.failed > 0) {
      const rem = REMEDIATIONS[r.category] || "Review category-specific safety measures.";
      lines.push(`- **${r.category}** (${r.failed} failures): ${rem}`);
    }
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
  lines.push("1. **Attack Generation**: Adversarial prompts generated via built-in corpus (optionally enhanced by LLM) across 9 attack categories mapped to OWASP LLM Top 10 and MITRE ATLAS.");
  lines.push("2. **Execution**: Prompts submitted to the target agent endpoint. Responses collected for evaluation.");
  lines.push("3. **Evaluation**: Responses judged via LLM-as-judge (with heuristic fallback) for signs of compromise. Swap-position double-judging mitigates position bias.");
  lines.push("4. **PII Detection**: Agent responses scanned against regex patterns for email, phone, SSN, API keys, tokens, and internal identifiers.");
  lines.push("5. **Statistical Analysis**: Wilson score interval (95% CI) computed for overall and per-category pass rates.");
  lines.push("6. **Graph Analysis**: Failure cascade relationships analyzed via Louvain community detection and PageRank (Neo4j GDS or JS fallback).");
  lines.push("");

  return lines.join("\n");
}

export function generateReportHtml(run: TestRun, results: TestResult[]): string {
  const ci = wilsonCI(run.passedTests, run.totalTests);

  const catRows = results.map(r => {
    const total = r.passed + r.failed;
    const catCI = wilsonCI(r.passed, total);
    const m = OWASP_MAP[r.category];
    const rem = r.failed > 0 ? REMEDIATIONS[r.category] || "" : "";
    return { ...r, total, catCI, m, rem };
  });

  const hasFailures = results.some(r => r.failed > 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AgentGuard Audit Report #${run.id}</title>
<style>
  @page { margin: 2cm; size: A4; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', -apple-system, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; padding: 0; }
  h1 { font-size: 20pt; font-weight: 800; margin-bottom: 4pt; letter-spacing: -0.5pt; }
  h2 { font-size: 14pt; font-weight: 700; margin: 24pt 0 8pt; border-bottom: 2px solid #222; padding-bottom: 4pt; }
  h3 { font-size: 12pt; font-weight: 700; margin: 16pt 0 6pt; }
  .subtitle { color: #666; font-size: 10pt; margin-bottom: 16pt; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0 16pt; font-size: 9.5pt; }
  th, td { padding: 5pt 8pt; text-align: left; border-bottom: 1px solid #ddd; }
  th { background: #f5f5f5; font-weight: 700; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5pt; }
  .severity-critical { color: #b91c1c; font-weight: 700; }
  .severity-high { color: #c2410c; font-weight: 600; }
  .severity-medium { color: #a16207; }
  .severity-low { color: #15803d; }
  .badge { display: inline-block; padding: 1pt 6pt; border-radius: 3pt; font-size: 8pt; font-weight: 700; }
  .badge-fail { background: #fef2f2; color: #b91c1c; }
  .remediation { font-size: 9.5pt; color: #444; margin: 2pt 0 6pt 12pt; padding: 4pt 8pt; border-left: 3px solid #b91c1c; background: #fafafa; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; margin: 8pt 0; }
  .summary-item { padding: 6pt 10pt; background: #f9f9f9; border-radius: 4pt; }
  .summary-label { font-size: 8pt; text-transform: uppercase; color: #888; letter-spacing: 0.5pt; }
  .summary-value { font-size: 14pt; font-weight: 700; }
  .footer { margin-top: 32pt; font-size: 8pt; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 8pt; }
</style>
</head>
<body>

<h1>AgentGuard Security Audit Report</h1>
<div class="subtitle">Run #${run.id} &mdash; ${run.completedAt ? new Date(run.completedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]} &mdash; ${run.status.toUpperCase()}</div>

<div class="summary-grid">
  <div class="summary-item"><div class="summary-label">Agent Readiness Score</div><div class="summary-value">${run.reliabilityScore || Math.round((run.passedTests / Math.max(run.totalTests, 1)) * 100)}%</div></div>
  <div class="summary-item"><div class="summary-label">95% Confidence</div><div class="summary-value">${formatCI(ci)}</div></div>
  <div class="summary-item"><div class="summary-label">Tests</div><div class="summary-value">${run.totalTests} total &middot; ${run.passedTests} passed &middot; ${run.failedTests} failed</div></div>
  <div class="summary-item"><div class="summary-label">Pass Rate</div><div class="summary-value">${run.totalTests > 0 ? (run.passedTests / run.totalTests * 100).toFixed(1) : "0"}%</div></div>
</div>

<h2>OWASP LLM / MITRE ATLAS Mapping</h2>
<table>
  <thead><tr><th>Category</th><th>OWASP LLM</th><th>OWASP Agentic</th><th>MITRE ATLAS</th><th>Severity</th></tr></thead>
  <tbody>
    ${results.map(r => {
      const m = OWASP_MAP[r.category];
      return `<tr>
        <td>${r.category}</td>
        <td>${m?.llm || "—"}</td>
        <td>${m?.agentic || "—"}</td>
        <td>${m?.atlas || "—"}</td>
        <td class="severity-${r.severity}">${r.severity.toUpperCase()}</td>
      </tr>`;
    }).join("\n    ")}
  </tbody>
</table>

<h2>Category Breakdown</h2>
<table>
  <thead><tr><th>Category</th><th>Passed</th><th>Failed</th><th>Pass Rate</th><th>95% CI</th><th>Severity</th><th>OWASP</th></tr></thead>
  <tbody>
    ${catRows.map(r => `<tr>
      <td>${r.category}</td>
      <td>${r.passed}</td>
      <td>${r.failed}</td>
      <td>${r.total > 0 ? (r.passed / r.total * 100).toFixed(1) : "0"}%</td>
      <td>${formatCI(r.catCI)}</td>
      <td class="severity-${r.severity}">${r.severity.toUpperCase()}</td>
      <td>${r.m?.llm || "—"}</td>
    </tr>`).join("\n    ")}
  </tbody>
</table>

${hasFailures ? `
<h2>Remediations</h2>
${catRows.filter(r => r.failed > 0).map(r => `
<div class="remediation"><strong>${r.category}</strong> (${r.failed} failures): ${r.rem}</div>
`).join("\n")}
` : ""}

<h2>Methodology</h2>
<p style="font-size:9.5pt;color:#444;margin-top:4pt;">
  1. <strong>Attack Generation</strong>: Adversarial prompts generated via built-in corpus across 9 attack categories mapped to OWASP LLM Top 10 and MITRE ATLAS.<br>
  2. <strong>Execution</strong>: Prompts submitted to the target agent endpoint. Responses collected for evaluation.<br>
  3. <strong>Evaluation</strong>: Responses judged via LLM-as-judge (with heuristic fallback). Swap-position double-judging mitigates position bias. Cohen's &kappa; reported per judgment.<br>
  4. <strong>PII Detection</strong>: Agent responses scanned against regex patterns for email, phone, SSN, API keys, and tokens.<br>
  5. <strong>Statistical Analysis</strong>: Wilson score interval (95% CI) computed for overall and per-category pass rates.<br>
  6. <strong>Graph Analysis</strong>: Failure cascade graph analyzed via Louvain community detection and PageRank (Neo4j GDS or JS fallback).
</p>

<div class="footer">Generated by AgentGuard &mdash; Brute-force agent reliability testing platform</div>

</body>
</html>`;
}

// ponytail: simple JSON schema validation. upgrade: use ajv or similar for detailed error paths.
export interface ReportData {
  runId: number;
  status: string;
  reliabilityScore: number;
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  categories: Array<{
    category: string;
    passed: number;
    failed: number;
    severity: string;
    findings?: Array<{
      prompt: string;
      status: string;
      response?: string;
    }>;
  }>;
}

export function validateReport(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== "object") return { valid: false, errors: ["Report must be an object"] };

  const r = data as Record<string, unknown>;
  if (typeof r.runId !== "number") errors.push("runId: must be a number");
  if (!["completed", "failed"].includes(r.status as string)) errors.push("status: must be 'completed' or 'failed'");
  if (typeof r.reliabilityScore !== "number" || r.reliabilityScore < 0 || r.reliabilityScore > 100)
    errors.push("reliabilityScore: must be a number 0-100");
  if (!Array.isArray(r.categories)) errors.push("categories: must be an array");
  else {
    const validSeverities = ["critical", "high", "medium", "low"];
    for (const [i, cat] of r.categories.entries()) {
      if (typeof cat.category !== "string") errors.push(`categories[${i}].category: must be a string`);
      if (typeof cat.passed !== "number") errors.push(`categories[${i}].passed: must be a number`);
      if (typeof cat.failed !== "number") errors.push(`categories[${i}].failed: must be a number`);
      if (!validSeverities.includes(cat.severity)) errors.push(`categories[${i}].severity: must be one of ${validSeverities.join(", ")}`);
      if (cat.findings && Array.isArray(cat.findings)) {
        for (const [j, f] of cat.findings.entries()) {
          if (typeof f.prompt !== "string") errors.push(`categories[${i}].findings[${j}].prompt: must be a string`);
          if (!["confirmed", "flaky", "inconclusive"].includes(f.status))
            errors.push(`categories[${i}].findings[${j}].status: must be one of confirmed, flaky, inconclusive`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateReportFile(filePath: string): { valid: boolean; errors: string[] } {
  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    return validateReport(data);
  } catch (err) {
    return { valid: false, errors: [`Failed to read or parse file: ${(err as Error).message}`] };
  }
}
