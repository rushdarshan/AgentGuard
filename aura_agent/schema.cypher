// AgentGuard — Failure Cascade Graph Schema
// Deploy this schema to Neo4j Aura before creating the agent.
// Run in Neo4j Browser or Aura Console Query Editor.

// Constraint
CREATE CONSTRAINT test_result_id IF NOT EXISTS FOR (r:TestResult) REQUIRE r.id IS UNIQUE;

// Indexes
CREATE INDEX test_result_category IF NOT EXISTS FOR (r:TestResult) ON (r.category);
CREATE INDEX test_result_run_id IF NOT EXISTS FOR (r:TestResult) ON (r.runId);

// Nodes: TestResult
//   id         — unique test result identifier
//   runId      — test run identifier
//   category   — attack category name
//   passed     — count of passed tests
//   failed     — count of failed tests
//   severity   — low / medium / high
//   score      — pass rate (0–100)
//   grade      — letter grade (A+ – F)
//   analyzedAt — timestamp of analysis
//
// Relationships: CAUSES
//   (source)-[:CAUSES {confidence: 0–100}]->(target)
//   A failure in source category cascades into target category with given confidence.
