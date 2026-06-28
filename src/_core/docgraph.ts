export interface DocNode {
  id: number;
  chunkIndex: number;
  text: string;
  wordCount: number;
}

export interface DocEdge {
  source: number;
  target: number;
  label: string;
}

export interface DocumentGraph {
  docId: string;
  docName: string;
  nodes: DocNode[];
  edges: DocEdge[];
}

const docStore = new Map<string, DocumentGraph>();
let docIdCounter = 0;

export function buildDocumentGraph(docName: string, chunks: string[]): DocumentGraph {
  const docId = `doc_${++docIdCounter}`;
  const nodes = chunks.map((text, i) => ({
    id: i,
    chunkIndex: i,
    text,
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
  }));

  const edges: DocEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ source: i, target: i + 1, label: 'NEXT' });
  }

  const graph: DocumentGraph = { docId, docName, nodes, edges };
  docStore.set(docId, graph);
  return graph;
}

export function searchDocumentGraph(docId: string, query: string): Array<{ chunkIndex: number; text: string; score: number }> {
  const graph = docStore.get(docId);
  if (!graph) return [];

  const queryWords = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  if (queryWords.length === 0) return [];

  const scored = graph.nodes.map(node => {
    const nodeWords = node.text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    const nodeWordSet = new Set(nodeWords);
    const matches = queryWords.filter(qw => nodeWordSet.has(qw)).length;
    return {
      chunkIndex: node.chunkIndex,
      text: node.text,
      score: queryWords.length > 0 ? matches / queryWords.length : 0,
    };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function listDocuments(): Array<{ docId: string; docName: string; nodeCount: number }> {
  return Array.from(docStore.values()).map(g => ({
    docId: g.docId,
    docName: g.docName,
    nodeCount: g.nodes.length,
  }));
}

export function getDocumentGraph(docId: string): DocumentGraph | undefined {
  return docStore.get(docId);
}
