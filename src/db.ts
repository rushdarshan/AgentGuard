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
  agents: [] as any[],
  testSuites: [] as any[],
  testRuns: [] as any[],
  testResults: [] as any[],
  failureCascades: [] as any[],
  nextId: { agents: 1, testSuites: 1, testRuns: 1, testResults: 1, failureCascades: 1 },
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
