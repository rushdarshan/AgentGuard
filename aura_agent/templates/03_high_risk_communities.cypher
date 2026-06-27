// High-Risk Communities — Categories where failure cascades cluster
// Run GDS Louvain first, then query communities
// Type: Cypher Template
// Parameters: none

CALL gds.louvain.stream('agentguard_graph')
YIELD nodeId, communityId
WITH gds.util.asNode(nodeId) AS node, communityId
RETURN communityId,
       collect(node.category) AS categories,
       avg(node.score)        AS avg_score,
       min(node.score)        AS min_score
ORDER BY avg_score ASC
LIMIT 10
