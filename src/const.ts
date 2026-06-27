export const COOKIE_NAME = "agentguard_session";

export interface DetectorDef {
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  owasp: string;
  agentic: string;
  atlas: string;
  tags: string[];
}

export const DETECTOR_REGISTRY: DetectorDef[] = [
  { name: "Prompt Injection",          severity: "critical", owasp: "LLM01", agentic: "ASI01", atlas: "ML-0017", tags: ["injection","input"] },
  { name: "Context Overflow",          severity: "high",     owasp: "LLM04", agentic: "—",     atlas: "ML-0025", tags: ["token","memory"] },
  { name: "Logic Collapse",            severity: "medium",   owasp: "LLM09", agentic: "—",     atlas: "—",       tags: ["reasoning","logic"] },
  { name: "Jailbreak",                 severity: "critical", owasp: "LLM01", agentic: "ASI01", atlas: "ML-0017", tags: ["bypass","role"] },
  { name: "Hallucination",             severity: "medium",   owasp: "LLM09", agentic: "—",     atlas: "ML-0020", tags: ["factuality","grounding"] },
  { name: "Schema Drift",              severity: "high",     owasp: "LLM02", agentic: "ASI06", atlas: "ML-0027", tags: ["format","structure"] },
  { name: "Multi-tenant Context Leak",  severity: "critical", owasp: "LLM06", agentic: "ASI03", atlas: "ML-0026", tags: ["isolation","tenant"] },
  { name: "Indirect Prompt Injection",  severity: "critical", owasp: "LLM02", agentic: "ASI02", atlas: "ML-0017", tags: ["injection","external"] },
  { name: "Multi-turn Crescendo",      severity: "high",     owasp: "LLM01", agentic: "ASI01", atlas: "ML-0017", tags: ["multi-turn","escalation"] },
  { name: "Memory Poisoning",          severity: "critical", owasp: "LLM02", agentic: "ASI04", atlas: "ML-0017", tags: ["memory","persistence"] },
] as const;

export const ATTACK_CATEGORIES = DETECTOR_REGISTRY.map(d => d.name) as readonly string[];
export type AttackCategory = (typeof ATTACK_CATEGORIES)[number];

export function getLoginUrl(): string {
  return "/dashboard";
}

export const RELIABILITY_THRESHOLDS = {
  healthy: 80,
  caution: 60,
  warning: 40,
} as const;

export function reliabilityBadge(score: number): string {
  return score >= 80 ? "badge-low" : score >= 60 ? "badge-medium" : score >= 40 ? "badge-high" : "badge-critical";
}

export function reliabilityLabel(score: number): string {
  return score >= 80 ? "Healthy" : score >= 60 ? "Caution" : score >= 40 ? "Warning" : "Critical";
}

export function reliabilityColor(score: number): string {
  return score >= 80 ? "text-[#346538]" : score >= 60 ? "text-[#956400]" : score >= 40 ? "text-[#9F2F2D]" : "text-[#9F2F2D]";
}
