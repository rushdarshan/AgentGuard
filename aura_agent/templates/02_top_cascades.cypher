// Top Cascades — Highest-confidence causal chains between categories
// Type: Cypher Template
// Parameters: none

MATCH (src:TestResult)-[c:CAUSES]->(tgt:TestResult)
RETURN src.category   AS source_category,
       src.score      AS source_score,
       tgt.category   AS target_category,
       tgt.score      AS target_score,
       c.confidence   AS cascade_confidence
ORDER BY c.confidence DESC
LIMIT 25
