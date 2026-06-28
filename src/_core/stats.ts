export interface WilsonCI {
  point: number;
  lower: number;
  upper: number;
  interval: number;
}

// ponytail: Wilson score interval for binomial proportions. No framework, no deps.
export function wilsonCI(passed: number, total: number, z = 1.96): WilsonCI {
  if (total === 0) return { point: 0, lower: 0, upper: 0, interval: 0 };

  const p = Math.min(1, passed / total);
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)) / denominator;

  return {
    point: p,
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    interval: (2 * margin) / 2,
  };
}

export function formatCI(ci: WilsonCI, decimals = 1): string {
  const pct = (v: number) => (v * 100).toFixed(decimals);
  return `${pct(ci.point)}% ± ${(ci.interval * 100).toFixed(decimals)}% [${pct(ci.lower)}–${pct(ci.upper)}]`;
}

export function isSignificant(ciA: WilsonCI, ciB: WilsonCI): boolean {
  return ciA.lower > ciB.upper || ciB.lower > ciA.upper;
}

export function computeCompositeScore(params: {
  passRate: number;
  cascadeImpact?: number;
  piiLeakRate?: number;
  severity?: string;
}): number {
  const severityScore = params.severity === "critical" ? 1 : params.severity === "high" ? 0.7 : params.severity === "medium" ? 0.4 : 0.1;
  const impact = params.cascadeImpact ?? 0;
  const pii = params.piiLeakRate ?? 0;
  return +(0.4 * params.passRate + 0.25 * impact + 0.2 * pii + 0.15 * severityScore).toFixed(3);
}

export function getLetterGrade(score: number): string {
  if (score >= 0.95) return "A+";
  if (score >= 0.9) return "A";
  if (score >= 0.85) return "A-";
  if (score >= 0.8) return "B+";
  if (score >= 0.75) return "B";
  if (score >= 0.7) return "B-";
  if (score >= 0.65) return "C+";
  if (score >= 0.6) return "C";
  if (score >= 0.55) return "C-";
  if (score >= 0.5) return "D+";
  if (score >= 0.4) return "D";
  return "F";
}

export function compareRuns(
  runA: { passedTests: number; totalTests: number; label?: string },
  runB: { passedTests: number; totalTests: number; label?: string }
): { a: WilsonCI; b: WilsonCI; significant: boolean } {
  const a = wilsonCI(runA.passedTests, runA.totalTests);
  const b = wilsonCI(runB.passedTests, runB.totalTests);
  return { a, b, significant: isSignificant(a, b) };
}
