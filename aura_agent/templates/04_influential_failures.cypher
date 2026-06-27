// Influential Failures — PageRank-identified high-impact categories
// Run GDS PageRank first, then query scores
// Type: Cypher Template
// Parameters: none

CALL gds.pageRank.stream('agentguard_graph')
YIELD nodeId, score
WITH gds.util.asNode(nodeId) AS node, score
RETURN node.category AS category,
       node.score    AS pass_rate,
       score         AS influence_score
ORDER BY influence_score DESC
LIMIT 10
