// AgentGuard — GraphRAG Vector Index Setup
// Creates a vector index over attack corpus embeddings for similarity search.
// Run in Neo4j Browser or Aura Console Query Editor after deploying schema.cypher.
// Requires: db.index.vector.createNodeIndex (Neo4j 5.15+)

// 1. Create vector index on TestResult embeddings (1536d = OpenAI ada-002)
CREATE VECTOR INDEX attack_embeddings IF NOT EXISTS
FOR (r:TestResult) ON (r.embedding)
OPTIONS { indexConfig: {
  `vector.dimensions`: 1536,
  `vector.similarity_function`: 'cosine'
}};

// 2. Create vector index on AttackCorpus prompts (for GraphRAG retrieval)
CREATE VECTOR INDEX prompt_embeddings IF NOT EXISTS
FOR (a:AttackCorpus) ON (a.embedding)
OPTIONS { indexConfig: {
  `vector.dimensions`: 1536,
  `vector.similarity_function`: 'cosine'
}};

// 3. Hybrid search: find similar past failures by attack vector
// Given a new attack prompt embedding $queryEmbedding:
// CALL db.index.vector.queryNodes('attack_embeddings', 5, $queryEmbedding)
// YIELD node, score
// MATCH (node)-[:CAUSES]->(target)
// RETURN node.category AS source, target.category AS cascade, score
//   ORDER BY score DESC, target.failed DESC

// 4. GraphRAG context builder: for a given category, retrieve top-N similar
// attack prompts + their cascade patterns, aggregate into LLM context window.
// CALL db.index.vector.queryNodes('prompt_embeddings', 10, $queryEmbedding)
// YIELD node, score
// OPTIONAL MATCH (node)-[:HAS_CASCADE]->(cascade)
// WITH node, score, collect(cascade.target) AS cascadeTargets
// RETURN node.category AS category, node.prompt AS examplePrompt,
//        score AS similarity, cascadeTargets
//   ORDER BY score DESC
//   LIMIT 5

// 5. Usage: AgentGuard retrieves top-3 similar attack results before
// evaluating a new prompt. The LLM judge receives:
//   "Similar past attacks: [prompts]. Their outcomes: [pass/fail].
//    New prompt: [input]. Evaluate."
// This grounds the judge in empirical evidence rather than pure reasoning.
