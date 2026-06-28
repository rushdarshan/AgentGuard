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
export const agentRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserAgents(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const agent = await db.getAgentById(input.agentId, ctx.user.id);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      return agent;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
        description: z.string().optional(),
        authHeaders: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data = {
        ...input,
        authHeaders: input.authHeaders ? Buffer.from(input.authHeaders).toString("base64") : undefined,
      };
      return db.createAgent(ctx.user.id, data);
    }),

  update: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        name: z.string().optional(),
        url: z.string().url().optional(),
        description: z.string().optional(),
        authHeaders: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { agentId, ...data } = input;
      const agent = await db.getAgentById(agentId, ctx.user.id);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      const updateData = {
        ...data,
        authHeaders: data.authHeaders ? Buffer.from(data.authHeaders).toString("base64") : undefined,
      };
      return db.updateAgent(agentId, ctx.user.id, updateData);
    }),

  delete: protectedProcedure
    .input(z.object({ agentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await db.getAgentById(input.agentId, ctx.user.id);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      return db.deleteAgent(input.agentId, ctx.user.id);
    }),
});

// ============ TEST SUITE ROUTER ============
