import { COOKIE_NAME, ATTACK_CATEGORIES } from "../const";
import { getSessionCookieOptions } from "../_core/cookies";
import { getOpenHackPrompts, type OpenHackPrompt } from "../_core/prompts/openhack";

import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { invokeLLM, evaluateWithLLM, evaluateHeuristic, getAvailableProviders, type Provider } from "../_core/llm";
import { MultiModelJudge, type FusedVerdict, type ModelVerdict } from "../_core/judge";
import { TRPCError } from "@trpc/server";

import { SessionManager } from "../_core/session-manager";
import { ENV } from "../_core/env";
import { scanPII, formatPIISummary } from "../_core/pii";
import { generateReport, generateReportHtml } from "../_core/report";
import { validateFindings, type ValidationStatus, type ValidatedFinding } from "../_core/validate";
import { analyzeRunGraph, computeLiftRatios, findCascadePaths, compareRuns as compareRunGraphs } from "../_core/neo4j";
import { generateIndicAttacks, getIndicAttackCategories, identifyLanguage } from "../_core/sarvam";
import { queryAuraAgent, AuraNotConfiguredError } from "../_core/aura";
import { extractText, chunkText } from "../_core/document";
import { buildDocumentGraph, searchDocumentGraph, listDocuments as listDocGraphs, getDocumentGraph } from "../_core/docgraph";

// ============ AGENT ROUTER ============

import { generateMockTests, simulateDemoRun, executeTestRunAsync, getAttacksForCategory, testAgentEndpoint, calculateSeverity, getGraphComparison } from "./shared";
export const demoRouter = router({
  launch: publicProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user?.id ?? 1;
    const host = ctx.req.headers.host || "localhost:4000";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";

    const demoAgent = await db.createAgent(userId, {
      name: "Demo Agent",
      url: `${protocol}://${host}/api/demo-agent`,
      description: "Demo agent showcasing AgentGuard's security testing capabilities.",
    });

    const agentId = (demoAgent as any).id;
    const result = await db.createTestRun(userId, agentId, undefined);
    const testRunId = (result as any).insertId ?? (result as any).id;

    const mockResults: Record<string, { passed: number; failed: number; severity: "critical" | "high" | "medium" | "low" }> = {
      "Prompt Injection":              { passed: 14, failed: 1, severity: "low" },
      "Context Overflow":              { passed: 13, failed: 2, severity: "low" },
      "Logic Collapse":                { passed: 14, failed: 1, severity: "low" },
      "Jailbreak":                     { passed: 15, failed: 0, severity: "low" },
      "Hallucination":                 { passed: 13, failed: 2, severity: "medium" },
      "Schema Drift":                  { passed: 14, failed: 1, severity: "low" },
      "Multi-tenant Context Leak":     { passed: 12, failed: 3, severity: "high" },
      "Indirect Prompt Injection":     { passed: 13, failed: 2, severity: "medium" },
      "Multi-turn Crescendo":          { passed: 11, failed: 4, severity: "critical" },
      "Tool Call Exploitation":        { passed: 12, failed: 3, severity: "critical" },
      "Long-Horizon Amnesia":          { passed: 10, failed: 5, severity: "high" },
    };

    await db.updateTestRun(testRunId, userId, {
      status: "running",
      totalTests: Object.values(mockResults).reduce((s, m) => s + m.passed + m.failed, 0),
      startedAt: new Date(),
    });

    simulateDemoRun(testRunId, userId, mockResults).catch(async (err) => {
      console.error("[demo] simulateDemoRun failed:", err);
      try { await db.updateTestRun(testRunId, userId, { status: "failed" }); } catch {}
    });

    return { testRunId, agentId };
  }),
});
