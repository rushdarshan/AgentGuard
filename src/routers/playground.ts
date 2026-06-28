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
export const playgroundRouter = router({
  test: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        prompt: z.string().min(1),
        language: z.string().default("en"),
        category: z.string().default("General"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch the agent
      const agent = await db.getAgentById(input.agentId, ctx.user.id);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });

      let promptToRun = input.prompt;

      // 3. Query the agent
      let responseText = "";
      try {
        responseText = await testAgentEndpoint(agent.url, promptToRun, agent.authHeaders);
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to query agent endpoint: ${err.message || err}`,
        });
      }

      // 4. Run safety evaluation
      let verdict;
      let usedHeuristics = false;

      if (!ENV.LLM_API_KEY) {
        verdict = evaluateHeuristic(promptToRun, responseText, input.category);
        usedHeuristics = true;
      } else {
        try {
          verdict = await evaluateWithLLM(promptToRun, responseText, input.category);
        } catch {
          verdict = evaluateHeuristic(promptToRun, responseText, input.category);
          usedHeuristics = true;
        }
      }

      return {
        originalPrompt: input.prompt,
        translatedPrompt: promptToRun,
        response: responseText,
        passed: verdict.passed,
        reasoning: verdict.reasoning,
        usedHeuristics,
      };
    }),
});

// ============ MAIN ROUTER ============
