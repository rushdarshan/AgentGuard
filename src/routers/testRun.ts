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
export const testRunRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        agentId: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return db.getUserTestRuns(ctx.user.id, input.agentId, input.limit, input.offset);
    }),

  get: protectedProcedure
    .input(z.object({ testRunId: z.number() }))
    .query(async ({ ctx, input }) => {
      const run = await db.getTestRunById(input.testRunId, ctx.user.id);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      return run;
    }),

  getResults: protectedProcedure
    .input(z.object({ testRunId: z.number() }))
    .query(async ({ ctx, input }) => {
      const run = await db.getTestRunById(input.testRunId, ctx.user.id);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      return db.getTestRunResults(input.testRunId);
    }),

  getCascades: protectedProcedure
    .input(z.object({ testRunId: z.number() }))
    .query(async ({ ctx, input }) => {
      const run = await db.getTestRunById(input.testRunId, ctx.user.id);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      return db.getFailureCascadesForRun(input.testRunId);
    }),

  getNeoCascades: protectedProcedure
    .input(z.object({ testRunId: z.number() }))
    .query(async ({ ctx, input }) => {
      const run = await db.getTestRunById(input.testRunId, ctx.user.id);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      const results = (await db.getTestRunResults(input.testRunId)) as any[];
      const cascades = (await db.getFailureCascadesForRun(input.testRunId)) as any[];
      return {
        nodes: results.map((r) => {
          let community: number | null = null;
          let pageRank = 0;
          let language = "en";
          try {
            const d = typeof r.details === "string" ? JSON.parse(r.details) : r.details || {};
            community = d.community ?? null;
            pageRank = d.pageRank ?? 0;
            language = d.language || (r.language as string) || "en";
          } catch { language = (r.language as string) || "en"; }
          return {
            id: r.id as number,
            category: r.category as string,
            passRate: r.passed + r.failed > 0 ? Math.round(r.passed / (r.passed + r.failed) * 100) : 0,
            language,
            community,
            pageRank,
          };
        }),
        edges: cascades.map((c) => ({
          sourceId: c.sourceResultId as number,
          targetId: c.targetResultId as number,
          confidence: (c.confidence as number) ?? 50,
        })),
      };
    }),

  getGraphMetrics: protectedProcedure
    .input(z.object({ testRunId: z.number() }))
    .query(async ({ ctx, input }) => {
      const run = await db.getTestRunById(input.testRunId, ctx.user.id);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      const results = (await db.getTestRunResults(input.testRunId)) as any[];
      const cascades = (await db.getFailureCascadesForRun(input.testRunId)) as any[];
      const { lifts, propagation } = await computeLiftRatios(
        input.testRunId,
        results.map((r: any) => ({ id: r.id, category: r.category, passed: r.passed, failed: r.failed })),
        cascades.map((c: any) => ({ sourceResultId: c.sourceResultId, targetResultId: c.targetResultId, confidence: c.confidence }))
      );
      const paths = await findCascadePaths(
        input.testRunId,
        results.map((r: any) => ({ id: r.id, category: r.category })),
        cascades.map((c: any) => ({ sourceResultId: c.sourceResultId, targetResultId: c.targetResultId, confidence: c.confidence }))
      );
      return { lifts, propagation, paths };
    }),

  report: protectedProcedure
    .input(z.object({ testRunId: z.number() }))
    .query(async ({ ctx, input }) => {
      const run = await db.getTestRunById(input.testRunId, ctx.user.id);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      const results = await db.getTestRunResults(input.testRunId);
      return generateReport(run, results as any[]);
    }),

  reportHtml: protectedProcedure
    .input(z.object({ testRunId: z.number() }))
    .query(async ({ ctx, input }) => {
      const run = await db.getTestRunById(input.testRunId, ctx.user.id);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      const results = await db.getTestRunResults(input.testRunId);
      return generateReportHtml(run, results as any[]);
    }),

  exportJson: protectedProcedure
    .input(z.object({ testRunId: z.number() }))
    .query(async ({ ctx, input }) => {
      const run = await db.getTestRunById(input.testRunId, ctx.user.id);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      const results = await db.getTestRunResults(input.testRunId);
      const cascades = await db.getFailureCascadesForRun(input.testRunId);

      const { wilsonCI: wCI } = await import("../_core/stats");
      const ci = wCI(run.passedTests, run.totalTests);

      const categories = (results as any[]).map((r: any) => {
        const total = r.passed + r.failed;
        const catCI = wCI(r.passed, total);
        let validation: any[] = [];
        let piiFindings: any[] = [];
        try {
          const d = r.details ? JSON.parse(r.details) : {};
          validation = d.validation || [];
          const tests: any[] = d.tests || [];
          piiFindings = tests.flatMap((t: any) => (t.pii || []).map((p: any) => ({
            label: p.label, value: p.value, start: p.start, end: p.end,
          })));
        } catch { /* skip */ }
        return {
          category: r.category,
          severity: r.severity,
          passed: r.passed,
          failed: r.failed,
          passRate: total > 0 ? r.passed / total : 0,
          wilsonCI: { point: catCI.point, lower: catCI.lower, upper: catCI.upper },
          validation: validation.map((v: any) => ({
            originalPrompt: v.originalPrompt,
            rephrasedPrompt: v.rephrasedPrompt,
            status: v.status,
          })),
          piiFindings,
        };
      });

      return {
        schema: "agentguard/audit-report/v1",
        run: {
          id: run.id,
          status: run.status,
          totalTests: run.totalTests,
          passedTests: run.passedTests,
          failedTests: run.failedTests,
          reliabilityScore: run.reliabilityScore,
          wilsonCI: { point: ci.point, lower: ci.lower, upper: ci.upper },
          startedAt: run.startedAt,
          completedAt: run.completedAt,
        },
        categories,
        cascades: (cascades as any[]).map((c: any) => ({
          sourceResultId: c.sourceResultId,
          targetResultId: c.targetResultId,
          confidence: c.confidence,
        })),
      };
    }),

  compareRuns: protectedProcedure
    .input(z.object({ runIdA: z.number(), runIdB: z.number() }))
    .query(async ({ ctx, input }) => {
      const runA = await db.getTestRunById(input.runIdA, ctx.user.id);
      const runB = await db.getTestRunById(input.runIdB, ctx.user.id);
      if (!runA || !runB) throw new TRPCError({ code: "NOT_FOUND" });
      const { compareRuns: cmpRuns } = await import("../_core/stats");
      const comparison = cmpRuns(
        { passedTests: runA.passedTests, totalTests: runA.totalTests },
        { passedTests: runB.passedTests, totalTests: runB.totalTests },
      );
      return {
        runA: { id: runA.id, passedTests: runA.passedTests, totalTests: runA.totalTests, ci: comparison.a },
        runB: { id: runB.id, passedTests: runB.passedTests, totalTests: runB.totalTests, ci: comparison.b },
        significant: comparison.significant,
        graph: await getGraphComparison(input.runIdA, input.runIdB),
      };
    }),

  compareGraph: protectedProcedure
    .input(z.object({ runIdA: z.number(), runIdB: z.number() }))
    .query(async ({ ctx, input }) => getGraphComparison(input.runIdA, input.runIdB)),

  create: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        testSuiteId: z.number().optional(),
        config: z.record(
          z.enum(ATTACK_CATEGORIES),
          z.object({
            intensity: z.enum(["low", "medium", "high"]),
            count: z.number().min(1).max(100),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify agent belongs to user
      const agent = await db.getAgentById(input.agentId, ctx.user.id);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });

      // Create test run
      const result = await db.createTestRun(ctx.user.id, input.agentId, input.testSuiteId);
      const testRunId = (result as any).insertId;

      // Enqueue execution in background (simplified for now)
      // In production, this would be a job queue
      executeTestRunAsync(testRunId, ctx.user.id, input.agentId, agent, input.config).catch(console.error);

      return { testRunId };
    }),
});

// ============ DEMO ROUTER ============
