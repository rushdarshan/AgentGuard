// Cascade Summary — Aggregate view of the latest test run
// Type: Cypher Template
// Parameters: none

MATCH (r:TestResult)
WHERE r.runId = r.runId  // scoped to current context
RETURN r.category       AS category,
       r.score          AS score,
       r.grade          AS grade,
       r.failed         AS failed,
       r.passed         AS passed,
       r.severity       AS severity
ORDER BY r.score ASC
LIMIT 25
