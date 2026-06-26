import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Agent endpoints registered by users for testing.
 * Each agent belongs to a user and stores connection details + metadata.
 */
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  url: varchar("url", { length: 2048 }).notNull(),
  authHeaders: text("authHeaders"), // JSON-encoded headers
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Test suite configurations: which attack categories to run and with what intensity.
 */
export const testSuites = mysqlTable("testSuites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  config: text("config").notNull(), // JSON: { "Prompt Injection": { intensity: "high", count: 10 }, ... }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TestSuite = typeof testSuites.$inferSelect;
export type InsertTestSuite = typeof testSuites.$inferInsert;

/**
 * Individual test runs: when a user executed a test suite against an agent.
 */
export const testRuns = mysqlTable("testRuns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId").notNull(),
  testSuiteId: int("testSuiteId"),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed", "cancelled"]).default("pending").notNull(),
  totalTests: int("totalTests").default(0).notNull(),
  passedTests: int("passedTests").default(0).notNull(),
  failedTests: int("failedTests").default(0).notNull(),
  reliabilityScore: int("reliabilityScore"), // 0-100
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TestRun = typeof testRuns.$inferSelect;
export type InsertTestRun = typeof testRuns.$inferInsert;

/**
 * Individual test results: per-attack-category breakdown and per-test details.
 */
export const testResults = mysqlTable("testResults", {
  id: int("id").autoincrement().primaryKey(),
  testRunId: int("testRunId").notNull(),
  category: varchar("category", { length: 100 }).notNull(), // "Prompt Injection", "Context Overflow", etc.
  passed: int("passed").default(0).notNull(),
  failed: int("failed").default(0).notNull(),
  severity: mysqlEnum("severity", ["critical", "high", "medium", "low"]).notNull(),
  details: text("details"), // JSON: { tests: [ { prompt: "...", response: "...", passed: true } ] }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = typeof testResults.$inferInsert;

/**
 * Failure cascade relationships: which test failures triggered downstream failures.
 */
export const failureCascades = mysqlTable("failureCascades", {
  id: int("id").autoincrement().primaryKey(),
  testRunId: int("testRunId").notNull(),
  sourceResultId: int("sourceResultId").notNull(), // The test that failed first
  targetResultId: int("targetResultId").notNull(), // The test that failed as a result
  confidence: int("confidence"), // 0-100, confidence that this is a real cascade
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FailureCascade = typeof failureCascades.$inferSelect;
export type InsertFailureCascade = typeof failureCascades.$inferInsert;

/**
 * Built-in and LLM-generated attack corpus.
 */
export const attackCorpus = mysqlTable("attackCorpus", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 100 }).notNull(), // "Prompt Injection", etc.
  prompt: text("prompt").notNull(),
  description: text("description"),
  severity: mysqlEnum("severity", ["critical", "high", "medium", "low"]).default("medium").notNull(),
  isBuiltIn: int("isBuiltIn").default(1).notNull(), // 1 = built-in, 0 = LLM-generated
  generatedForAgentId: int("generatedForAgentId"), // If LLM-generated, which agent
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AttackCorpus = typeof attackCorpus.$inferSelect;
export type InsertAttackCorpus = typeof attackCorpus.$inferInsert;