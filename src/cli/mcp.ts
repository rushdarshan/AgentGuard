import { createInterface } from "readline/promises";
import { getAttacksForCategory, testAgentEndpoint } from "../routers";
import { MultiModelJudge } from "../_core/judge";
import { evaluateHeuristic, getAvailableProviders } from "../_core/llm";
import { generateHardeningConfig } from "../_core/harden";
import { getLetterGrade } from "../_core/stats";
import { ATTACK_CATEGORIES } from "../const";

// ponytail: raw JSON-RPC over stdio, no MCP SDK dep.
export async function connect() {
  const rl = createInterface({ input: process.stdin });

  function respond(id: number | string | undefined | null, result?: unknown, error?: { code: number; message: string }) {
    const msg: Record<string, unknown> = { jsonrpc: "2.0" };
    if (id != null) msg.id = id;
    if (error) msg.error = error;
    else msg.result = result;
    process.stdout.write(JSON.stringify(msg) + "\n");
  }

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let req: { jsonrpc: "2.0"; id?: number | string; method: string; params?: Record<string, unknown> };
    try { req = JSON.parse(trimmed); } catch (err) { console.warn(err);  continue; }

    if (req.method === "notifications/initialized") continue;

    try {
      if (req.method === "initialize") {
        respond(req.id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "agentguard", version: "1.0.0" } });
      } else if (req.method === "tools/list") {
        respond(req.id, {
          tools: [
            {
              name: "agentguard_test",
              description: "Run adversarial attack tests against an agent endpoint",
              inputSchema: { type: "object", properties: { url: { type: "string", description: "Agent endpoint URL" }, description: { type: "string" }, intensity: { type: "string", enum: ["low", "medium", "high"], default: "medium" }, count: { type: "number", default: 5 } }, required: ["url"] },
            },
            {
              name: "agentguard_harden",
              description: "Generate hardening config from test run findings",
              inputSchema: { type: "object", properties: { score: { type: "number" }, findings: { type: "array", items: { type: "object", properties: { category: { type: "string" }, prompt: { type: "string" }, severity: { type: "string" } }, required: ["category", "prompt", "severity"] } } }, required: ["score", "findings"] },
            },
            {
              name: "agentguard_pre_push",
              description: "Quick check — passes when score >= threshold",
              inputSchema: { type: "object", properties: { url: { type: "string" }, threshold: { type: "number", default: 80 } }, required: ["url"] },
            },
          ],
        });
      } else if (req.method === "tools/call") {
        const name = req.params?.name as string;
        const args = (req.params?.arguments ?? {}) as Record<string, unknown>;

        if (name === "agentguard_test") {
          const url = args.url as string;
          if (!url) { respond(req.id, undefined, { code: -32602, message: "Missing url" }); continue; }
          const count = (args.count as number) ?? 5;
          const intensity = (args.intensity as string) ?? "medium";
          const desc = (args.description as string) ?? "";
          let total = 0, passed = 0;
          const findings: Array<{ category: string; passed: number; failed: number; severity: string }> = [];
          for (const cat of ATTACK_CATEGORIES) {
            const attacks = await getAttacksForCategory(cat, { url, description: desc }, intensity, count);
            let cp = 0, cf = 0;
            for (let i = 0; i < attacks.length; i++) {
              const ctx = `Test ${i + 1} of ${attacks.length} for "${cat}".`;
              try {
                const response = await testAgentEndpoint(url, attacks[i].text);
                const providers = getAvailableProviders();
                let v;
                try { v = await MultiModelJudge.evaluate(attacks[i].text, response, cat, providers, ctx); }
                catch (err) { console.warn(err);  v = evaluateHeuristic(attacks[i].text, response, cat); }
                if (v.passed) cp++; else cf++;
              } catch (err) { console.warn(err);  cf++; }
            }
            passed += cp; total += cp + cf;
            findings.push({ category: cat, passed: cp, failed: cf, severity: cf === 0 ? "low" : cf <= 2 ? "medium" : "high" });
          }
          const score = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
          respond(req.id, { content: [{ type: "text", text: JSON.stringify({ score, passedTests: passed, totalTests: total, findings, grade: getLetterGrade(score / 100) }, null, 2) }] });
        } else if (name === "agentguard_harden") {
          const score = args.score as number;
          const f = args.findings as Array<{ category: string; prompt: string; severity: string }> | undefined;
          if (!f || !Array.isArray(f)) { respond(req.id, undefined, { code: -32602, message: "Missing findings" }); continue; }
          const config = generateHardeningConfig(0, score, f.map(x => ({ ...x, response: "" })));
          respond(req.id, { content: [{ type: "text", text: JSON.stringify(config, null, 2) }] });
        } else if (name === "agentguard_pre_push") {
          const url = args.url as string;
          const threshold = (args.threshold as number) ?? 80;
          if (!url) { respond(req.id, undefined, { code: -32602, message: "Missing url" }); continue; }
          let total = 0, passed = 0;
          for (const cat of ATTACK_CATEGORIES.slice(0, 3)) {
            const attacks = await getAttacksForCategory(cat, { url, description: "" }, "low", 1);
            for (const a of attacks) {
              try {
                const response = await testAgentEndpoint(url, a.text);
                const providers = getAvailableProviders();
                let v;
                try { v = await MultiModelJudge.evaluate(a.text, response, cat, providers, `Quick check for "${cat}".`); }
                catch (err) { console.warn(err);  v = evaluateHeuristic(a.text, response, cat); }
                if (v.passed) passed++;
                total++;
              } catch (err) { console.warn(err);  total++; }
            }
          }
          const score = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
          respond(req.id, { content: [{ type: "text", text: JSON.stringify({ score, threshold, passed: score >= threshold, grade: getLetterGrade(score / 100) }, null, 2) }] });
        } else {
          respond(req.id, undefined, { code: -32601, message: `Unknown tool: ${name}` });
        }
      } else {
        respond(req.id, undefined, { code: -32601, message: `Unknown method: ${req.method}` });
      }
    } catch (err) {
      respond(req.id, undefined, { code: -32603, message: err instanceof Error ? err.message : "Internal error" });
    }
  }

  process.stderr.write("AgentGuard MCP server running on stdio\n");
}
