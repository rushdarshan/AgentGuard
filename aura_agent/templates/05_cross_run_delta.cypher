// Cross-Run Delta — Compare two test runs for category changes
// Type: Cypher Template
// Parameters: {runIdA: number, runIdB: number}

MATCH (a:TestResult {runId: $runIdA}), (b:TestResult {runId: $runIdB})
WHERE a.category = b.category AND a.score <> b.score
RETURN a.category      AS category,
       a.score         AS old_score,
       b.score         AS new_score,
       b.score - a.score AS delta
ORDER BY delta ASC
LIMIT 25
