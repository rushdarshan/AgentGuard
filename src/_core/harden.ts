export interface HardeningRule {
  category: string;
  pattern: string;
  severity: string;
  mitigation: string;
}

export interface HardeningConfig {
  generatedAt: string;
  runId: number;
  agentReadinessScore: number;
  summary: string;
  rules: HardeningRule[];
  toolConfig: {
    inputValidation: string[];
    outputValidation: string[];
    rateLimiting: string[];
  };
}

export function generateHardeningConfig(
  runId: number,
  score: number,
  findings: Array<{ category: string; prompt: string; severity: string; response?: string }>
): HardeningConfig {
  const rules: HardeningRule[] = findings.map(f => ({
    category: f.category,
    pattern: extractPattern(f.prompt),
    severity: f.severity,
    mitigation: getMitigation(f.category),
  }));

  const cats = [...new Set(findings.map(f => f.category))];

  return {
    generatedAt: new Date().toISOString(),
    runId,
    agentReadinessScore: score,
    summary: `${findings.length} failure${findings.length === 1 ? "" : "s"} across ${cats.length} categor${cats.length === 1 ? "y" : "ies"}. ${score < 50 ? "Critical" : score < 80 ? "Elevated" : "Low"} risk profile.`,
    rules,
    toolConfig: {
      inputValidation: [
        ...cats.map(c => `reject prompts matching known ${c.toLowerCase()} patterns`),
        "sanitize system prompt override attempts",
        "validate input against expected schema before processing",
      ],
      outputValidation: [
        ...cats.filter(c => c === "PII Leak" || c === "Multi-tenant Context Leak").map(c => `scan output for ${c.toLowerCase()} indicators`),
        "refuse to emit raw credentials or tokens",
        "apply content safety classifier to responses",
      ],
      rateLimiting: [
        "cap per-session request rate to prevent brute-force probing",
        "enforce token budget per conversation turn",
        "circuit-break after N consecutive safety violations",
      ],
    },
  };
}

// ponytail: simple pattern extraction. upgrade: use AST-level prompt analysis.
function extractPattern(prompt: string): string {
  const cleaned = prompt.replace(/\{seed\}/g, "{variable}").replace(/\d{4,}/g, "{number}");
  if (cleaned.length > 120) return cleaned.slice(0, 117) + "...";
  return cleaned;
}

function getMitigation(category: string): string {
  const map: Record<string, string> = {
    "Prompt Injection": "Implement instruction hierarchy with delimiter-based separation. Reject inputs containing system prompt override keywords.",
    "Indirect Prompt Injection": "Validate external content before ingestion. Treat retrieved documents as untrusted input.",
    "Multi-turn Crescendo": "Track safety boundary consistency across conversation turns. Reset refusal state on topic shifts.",
    "Jailbreak": "Apply role-locking and adversarial refusal training. Detect DAN/roleplay escape patterns.",
    "Context Overflow": "Monitor token budget with early warning. Preserve safety instructions during truncation.",
    "Hallucination": "Ground responses in verified sources. Require citations for factual claims.",
    "Schema Drift": "Strict input schema validation. Reject malformed payloads before processing.",
    "Logic Collapse": "Add logical consistency checks. Detect self-contradictory chains in inputs.",
    "Multi-tenant Context Leak": "Enforce per-user context isolation. Never allow cross-tenant data access.",
  };
  return map[category] || "Review and restrict this attack surface.";
}
