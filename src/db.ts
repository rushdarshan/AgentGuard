import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser, users, agents, testRuns, testResults, testSuites, attackCorpus, failureCascades,
} from "./schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && ENV.DATABASE_URL) {
    try {
      const connection = await mysql.createConnection(ENV.DATABASE_URL);
      _db = drizzle(connection);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ponytail: in-memory fallback when no MySQL. upgrade: real DB in production.
const mem = {
  agents: [
    { id: 1, userId: 1, name: "Demo ChatBot", url: "http://localhost:4000/api/demo-agent", description: "Customer support assistant for Acme Corp (demo)", isActive: 1, createdAt: new Date("2026-06-20"), updatedAt: new Date("2026-06-20") },
    { id: 2, userId: 1, name: "API Assistant", url: "http://localhost:4000/api/real-agent", description: "Llama-3.1-8B agent with system prompt guardrails", isActive: 1, createdAt: new Date("2026-06-22"), updatedAt: new Date("2026-06-22") },
  ],
  testSuites: [] as any[],
  testRuns: [
    { id: 1, userId: 1, agentId: 1, testSuiteId: null, status: "completed", totalTests: 45, passedTests: 32, failedTests: 13, reliabilityScore: 71, startedAt: new Date("2026-06-20T10:00:00"), completedAt: new Date("2026-06-20T10:05:00"), createdAt: new Date("2026-06-20T10:00:00") },
    { id: 2, userId: 1, agentId: 1, testSuiteId: null, status: "completed", totalTests: 45, passedTests: 38, failedTests: 7, reliabilityScore: 84, startedAt: new Date("2026-06-25T14:00:00"), completedAt: new Date("2026-06-25T14:04:00"), createdAt: new Date("2026-06-25T14:00:00") },
    { id: 3, userId: 1, agentId: 2, testSuiteId: null, status: "completed", totalTests: 45, passedTests: 41, failedTests: 4, reliabilityScore: 91, startedAt: new Date("2026-06-26T09:00:00"), completedAt: new Date("2026-06-26T09:03:00"), createdAt: new Date("2026-06-26T09:00:00") },
  ],
  testResults: [
    { id: 1,  testRunId: 1, category: "Prompt Injection",             passed: 3, failed: 2, severity: "high",    details: "{}", createdAt: new Date("2026-06-20") },
    { id: 2,  testRunId: 1, category: "Indirect Prompt Injection",    passed: 2, failed: 3, severity: "high",    details: "{}", createdAt: new Date("2026-06-20") },
    { id: 3,  testRunId: 1, category: "Multi-turn Crescendo",         passed: 4, failed: 1, severity: "medium",  details: "{}", createdAt: new Date("2026-06-20") },
    { id: 4,  testRunId: 1, category: "Jailbreak",                    passed: 3, failed: 2, severity: "high",    details: "{}", createdAt: new Date("2026-06-20") },
    { id: 5,  testRunId: 1, category: "Context Overflow",             passed: 4, failed: 1, severity: "medium",  details: "{}", createdAt: new Date("2026-06-20") },
    { id: 6,  testRunId: 1, category: "Hallucination",                passed: 5, failed: 0, severity: "low",    details: "{}", createdAt: new Date("2026-06-20") },
    { id: 7,  testRunId: 1, category: "Schema Drift",                 passed: 4, failed: 1, severity: "medium",  details: "{}", createdAt: new Date("2026-06-20") },
    { id: 8,  testRunId: 1, category: "Logic Collapse",               passed: 5, failed: 0, severity: "low",    details: "{}", createdAt: new Date("2026-06-20") },
    { id: 9,  testRunId: 1, category: "Multi-tenant Context Leak",    passed: 2, failed: 3, severity: "critical",details: "{}", createdAt: new Date("2026-06-20") },
    { id: 10, testRunId: 2, category: "Prompt Injection",             passed: 4, failed: 1, severity: "high",    details: "{}", createdAt: new Date("2026-06-25") },
    { id: 11, testRunId: 2, category: "Indirect Prompt Injection",    passed: 3, failed: 2, severity: "high",    details: "{}", createdAt: new Date("2026-06-25") },
    { id: 12, testRunId: 2, category: "Multi-turn Crescendo",         passed: 5, failed: 0, severity: "low",    details: "{}", createdAt: new Date("2026-06-25") },
    { id: 13, testRunId: 2, category: "Jailbreak",                    passed: 4, failed: 1, severity: "medium",  details: "{}", createdAt: new Date("2026-06-25") },
    { id: 14, testRunId: 2, category: "Context Overflow",             passed: 5, failed: 0, severity: "low",    details: "{}", createdAt: new Date("2026-06-25") },
    { id: 15, testRunId: 2, category: "Hallucination",                passed: 5, failed: 0, severity: "low",    details: "{}", createdAt: new Date("2026-06-25") },
    { id: 16, testRunId: 2, category: "Schema Drift",                 passed: 4, failed: 1, severity: "medium",  details: "{}", createdAt: new Date("2026-06-25") },
    { id: 17, testRunId: 2, category: "Logic Collapse",               passed: 4, failed: 1, severity: "medium",  details: "{}", createdAt: new Date("2026-06-25") },
    { id: 18, testRunId: 2, category: "Multi-tenant Context Leak",    passed: 4, failed: 1, severity: "high",    details: "{}", createdAt: new Date("2026-06-25") },
    { id: 19, testRunId: 3, category: "Prompt Injection",             passed: 5, failed: 0, severity: "low",    details: "{}", createdAt: new Date("2026-06-26") },
    { id: 20, testRunId: 3, category: "Indirect Prompt Injection",    passed: 4, failed: 1, severity: "medium",  details: "{}", createdAt: new Date("2026-06-26") },
    { id: 21, testRunId: 3, category: "Multi-turn Crescendo",         passed: 5, failed: 0, severity: "low",    details: "{}", createdAt: new Date("2026-06-26") },
    { id: 22, testRunId: 3, category: "Jailbreak",                    passed: 5, failed: 0, severity: "low",    details: "{}", createdAt: new Date("2026-06-26") },
    { id: 23, testRunId: 3, category: "Context Overflow",             passed: 4, failed: 1, severity: "medium",  details: "{}", createdAt: new Date("2026-06-26") },
    { id: 24, testRunId: 3, category: "Hallucination",                passed: 5, failed: 0, severity: "low",    details: "{}", createdAt: new Date("2026-06-26") },
    { id: 25, testRunId: 3, category: "Schema Drift",                 passed: 5, failed: 0, severity: "low",    details: "{}", createdAt: new Date("2026-06-26") },
    { id: 26, testRunId: 3, category: "Logic Collapse",               passed: 4, failed: 1, severity: "medium",  details: "{}", createdAt: new Date("2026-06-26") },
    { id: 27, testRunId: 3, category: "Multi-tenant Context Leak",    passed: 4, failed: 1, severity: "high",    details: "{}", createdAt: new Date("2026-06-26") },
  ],
  failureCascades: [
    { id: 1,  testRunId: 1, sourceResultId: 1,  targetResultId: 4,  confidence: 80, createdAt: new Date() },
    { id: 2,  testRunId: 1, sourceResultId: 1,  targetResultId: 2,  confidence: 75, createdAt: new Date() },
    { id: 3,  testRunId: 1, sourceResultId: 2,  targetResultId: 9,  confidence: 70, createdAt: new Date() },
    { id: 4,  testRunId: 1, sourceResultId: 4,  targetResultId: 9,  confidence: 65, createdAt: new Date() },
    { id: 5,  testRunId: 1, sourceResultId: 9,  targetResultId: 7,  confidence: 55, createdAt: new Date() },
    { id: 6,  testRunId: 2, sourceResultId: 10, targetResultId: 13, confidence: 60, createdAt: new Date() },
    { id: 7,  testRunId: 2, sourceResultId: 13, targetResultId: 18, confidence: 50, createdAt: new Date() },
    { id: 8,  testRunId: 2, sourceResultId: 11, targetResultId: 18, confidence: 45, createdAt: new Date() },
    { id: 9,  testRunId: 3, sourceResultId: 20, targetResultId: 27, confidence: 40, createdAt: new Date() },
    { id: 10, testRunId: 3, sourceResultId: 23, targetResultId: 26, confidence: 35, createdAt: new Date() },
  ],
  nextId: { agents: 3, testSuites: 1, testRuns: 4, testResults: 28, failureCascades: 11 },
};

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserAgents(userId: number) {
  const db = await getDb();
  if (db) return db.select().from(agents).where(eq(agents.userId, userId));
  return mem.agents.filter((a) => a.userId === userId);
}

export async function getAgentById(agentId: number, userId: number) {
  const db = await getDb();
  if (db) { const r = await db.select().from(agents).where(and(eq(agents.id, agentId), eq(agents.userId, userId))).limit(1); return r[0]; }
  return mem.agents.find((a) => a.id === agentId && a.userId === userId);
}

export async function createAgent(userId: number, data: { name: string; url: string; description?: string; authHeaders?: string }) {
  const db = await getDb();
  if (db) return db.insert(agents).values({ userId, ...data });
  const id = mem.nextId.agents++;
  const agent = { id, userId, ...data, createdAt: new Date() };
  mem.agents.push(agent);
  return agent;
}

export async function updateAgent(agentId: number, userId: number, data: Partial<{ name: string; url: string; description: string; authHeaders: string }>) {
  const db = await getDb();
  if (db) return db.update(agents).set(data).where(and(eq(agents.id, agentId), eq(agents.userId, userId)));
  const idx = mem.agents.findIndex((a) => a.id === agentId && a.userId === userId);
  if (idx === -1) throw new Error("Agent not found");
  Object.assign(mem.agents[idx], data);
  return mem.agents[idx];
}

export async function deleteAgent(agentId: number, userId: number) {
  const db = await getDb();
  if (db) return db.delete(agents).where(and(eq(agents.id, agentId), eq(agents.userId, userId)));
  const idx = mem.agents.findIndex((a) => a.id === agentId && a.userId === userId);
  if (idx === -1) throw new Error("Agent not found");
  mem.agents.splice(idx, 1);
}

export async function getUserTestSuites(userId: number, agentId?: number) {
  const db = await getDb();
  if (db) { const conditions = [eq(testSuites.userId, userId)]; if (agentId) conditions.push(eq(testSuites.agentId, agentId)); return db.select().from(testSuites).where(and(...conditions)); }
  let result = mem.testSuites.filter((s) => s.userId === userId);
  if (agentId) result = result.filter((s) => s.agentId === agentId);
  return result;
}

export async function createTestSuite(userId: number, agentId: number, data: { name: string; config: string }) {
  const db = await getDb();
  if (db) return db.insert(testSuites).values({ userId, agentId, ...data });
  const id = mem.nextId.testSuites++;
  const suite = { id, userId, agentId, ...data, createdAt: new Date() };
  mem.testSuites.push(suite);
  return suite;
}

export async function getUserTestRuns(userId: number, agentId?: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (db) { const conditions = [eq(testRuns.userId, userId)]; if (agentId) conditions.push(eq(testRuns.agentId, agentId)); return db.select().from(testRuns).where(and(...conditions)).orderBy(testRuns.createdAt).limit(limit).offset(offset); }
  let result = mem.testRuns.filter((r) => r.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (agentId) result = result.filter((r) => r.agentId === agentId);
  return result.slice(offset, offset + limit);
}

export async function getTestRunById(testRunId: number, userId: number) {
  const db = await getDb();
  if (db) { const r = await db.select().from(testRuns).where(and(eq(testRuns.id, testRunId), eq(testRuns.userId, userId))).limit(1); return r[0]; }
  return mem.testRuns.find((r) => r.id === testRunId && r.userId === userId);
}

export async function createTestRun(userId: number, agentId: number, testSuiteId?: number) {
  const db = await getDb();
  if (db) return db.insert(testRuns).values({ userId, agentId, testSuiteId, status: "pending" });
  const id = mem.nextId.testRuns++;
  const run: any = { id, userId, agentId, testSuiteId: testSuiteId ?? null, status: "pending", totalTests: 0, passedTests: 0, failedTests: 0, reliabilityScore: 0, startedAt: null, completedAt: null, createdAt: new Date() };
  mem.testRuns.push(run);
  return { insertId: id };
}

export async function updateTestRun(testRunId: number, userId: number, data: Partial<{ status: "pending" | "running" | "completed" | "failed" | "cancelled"; totalTests: number; passedTests: number; failedTests: number; reliabilityScore: number; startedAt: Date; completedAt: Date }>) {
  const db = await getDb();
  if (db) return db.update(testRuns).set(data).where(and(eq(testRuns.id, testRunId), eq(testRuns.userId, userId)));
  const run = mem.testRuns.find((r) => r.id === testRunId && r.userId === userId);
  if (!run) throw new Error("Test run not found");
  Object.assign(run, data);
  return run;
}

export async function getTestRunResults(testRunId: number) {
  const db = await getDb();
  if (db) return db.select().from(testResults).where(eq(testResults.testRunId, testRunId));
  return mem.testResults.filter((r) => r.testRunId === testRunId);
}

export async function updateTestResult(resultId: number, data: Partial<{ details: string }>) {
  const db = await getDb();
  if (db) return db.update(testResults).set(data).where(eq(testResults.id, resultId));
  const result = mem.testResults.find((r) => r.id === resultId);
  if (!result) throw new Error("Test result not found");
  Object.assign(result, data);
  return result;
}

export async function createTestResult(testRunId: number, data: { category: string; passed: number; failed: number; severity: "critical" | "high" | "medium" | "low"; details?: string }) {
  const db = await getDb();
  if (db) return db.insert(testResults).values([{ testRunId, ...data }]);
  const id = mem.nextId.testResults++;
  const result = { id, testRunId, ...data, createdAt: new Date() };
  mem.testResults.push(result);
  return result;
}

export async function getAttackCorpusByCategory(category: string, limit = 100) {
  const db = await getDb();
  if (db) return db.select().from(attackCorpus).where(eq(attackCorpus.category, category)).limit(limit);
  return [];
}

export async function createAttackCorpusEntry(data: { category: string; prompt: string; description?: string; severity: "critical" | "high" | "medium" | "low"; isBuiltIn: number; generatedForAgentId?: number }) {
  const db = await getDb();
  if (db) return db.insert(attackCorpus).values([data]);
  // ponytail: corpus entries not persisted in mem store; built-in corpus covers demo
}

export async function getFailureCascadesForRun(testRunId: number) {
  const db = await getDb();
  if (db) return db.select().from(failureCascades).where(eq(failureCascades.testRunId, testRunId));
  return mem.failureCascades.filter((c) => c.testRunId === testRunId);
}

export async function createFailureCascade(testRunId: number, data: { sourceResultId: number; targetResultId: number; confidence?: number }) {
  const db = await getDb();
  if (db) return db.insert(failureCascades).values({ testRunId, ...data });
  const id = mem.nextId.failureCascades++;
  const cascade = { id, testRunId, ...data, createdAt: new Date() };
  mem.failureCascades.push(cascade);
  return cascade;
}
