import * as fs from "node:fs";
import { generateHardeningConfig } from "../_core/harden";

interface HardenOptions {
  json?: boolean;
}

export function hardenCommand(file: string, options: HardenOptions) {
  const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
  const runId = raw.runId ?? 0;
  const score = raw.score ?? raw.agentReadinessScore ?? 0;
  const findings: Array<{ category: string; prompt: string; severity: string }> = [];

  if (raw.findings) {
    for (const f of raw.findings) {
      if (f.failed > 0) {
        findings.push({ category: f.category, prompt: f.prompt ?? `${f.category} attack`, severity: f.severity ?? "medium" });
      }
    }
  }

  if (findings.length === 0) {
    console.log("No failures to harden against. Run agentguard test first.");
    return;
  }

  const config = generateHardeningConfig(runId, score, findings);

  if (options.json) {
    console.log(JSON.stringify(config, null, 2));
  } else {
    console.log(`\nAgentGuard Hardening Config`);
    console.log(`==========================`);
    console.log(`Score: ${config.agentReadinessScore}/100`);
    console.log(`Summary: ${config.summary}`);
    console.log(`\nRules (${config.rules.length}):`);
    for (const r of config.rules) {
      console.log(`  [${r.severity}] ${r.category}`);
      console.log(`    pattern: ${r.pattern}`);
      console.log(`    fix: ${r.mitigation.slice(0, 80)}...`);
    }
    console.log(`\nInput Validation:`);
    for (const v of config.toolConfig.inputValidation) console.log(`  - ${v}`);
    console.log(`\nOutput Validation:`);
    for (const v of config.toolConfig.outputValidation) console.log(`  - ${v}`);
    console.log(`\nRate Limiting:`);
    for (const v of config.toolConfig.rateLimiting) console.log(`  - ${v}`);
  }
}
