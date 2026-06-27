// Text2Cypher — Ad-hoc natural-language questions about the test graph
// Type: Text2Cypher
// Schema hint for the LLM:
//   (:TestResult {id, runId, category, passed, failed, severity, score, grade})
//   (:TestResult)-[:CAUSES {confidence}]->(:TestResult)
// Generate read-only MATCH/WITH/RETURN only. Always end with LIMIT 25.
