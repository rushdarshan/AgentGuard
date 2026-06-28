import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import DemoCascadeGraph, { CATEGORY_COLORS } from "@/components/DemoCascadeGraph";
import type { Node, Edge } from "@/components/DemoCascadeGraph";
import { UploadIcon, ReloadIcon, ReaderIcon, FileIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { trpc } from "@/lib/trpc";

function hashColor(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 55%)`;
}

interface TestResult {
  category: string;
  passed: number;
  failed: number;
  severity?: number;
}

function validateData(json: unknown): json is TestResult[] {
  return (
    Array.isArray(json) &&
    json.length > 0 &&
    json.every(
      (r) =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as any).category === "string" &&
        typeof (r as any).passed === "number" &&
        typeof (r as any).failed === "number"
    )
  );
}

function transformToGraph(results: TestResult[]): { nodes: Node[]; edges: Edge[] } {
  const agg = new Map<string, { passed: number; failed: number; severity: number }>();
  for (const r of results) {
    const prev = agg.get(r.category) ?? { passed: 0, failed: 0, severity: r.severity ?? 0 };
    prev.passed += r.passed;
    prev.failed += r.failed;
    if (r.severity !== undefined) prev.severity = Math.max(prev.severity, r.severity);
    agg.set(r.category, prev);
  }

  const nodes: Node[] = [];
  let id = 1;
  for (const [category, stats] of agg) {
    const total = stats.passed + stats.failed;
    nodes.push({
      id: id++,
      category,
      passRate: Math.round((stats.passed / total) * 100),
      community: stats.severity,
    });
    if (!CATEGORY_COLORS[category]) {
      (CATEGORY_COLORS as Record<string, string>)[category] = hashColor(category);
    }
  }

  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const rateSim = 100 - Math.abs(a.passRate - b.passRate);
      const commSim = a.community === b.community ? 20 : 0;
      const confidence = Math.min(rateSim + commSim, 100);
      if (confidence > 30) {
        edges.push({ source: a.id, target: b.id, confidence });
      }
    }
  }

  return { nodes, edges };
}

export default function Graph() {
  const [graphData, setGraphData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Document upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docInfo, setDocInfo] = useState<{ docId: string; docName: string; chunkCount: number } | null>(null);
  const [documents, setDocuments] = useState<Array<{ docId: string; docName: string; nodeCount: number }>>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docQuery, setDocQuery] = useState("");
  const [submittedDocQuery, setSubmittedDocQuery] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const queryResult = trpc.queryGraph.useQuery(
    { question: submittedQuestion ?? "" },
    { enabled: !!submittedQuestion }
  );

  const uploadDoc = trpc.uploadDocument.useMutation();
  const docsQuery = trpc.listDocuments.useQuery();
  const docQueryResult = trpc.queryDocument.useQuery(
    { docId: selectedDocId ?? "", query: submittedDocQuery ?? "" },
    { enabled: !!selectedDocId && !!submittedDocQuery }
  );
  const docGraphResult = trpc.getDocumentGraph.useQuery(
    { docId: selectedDocId ?? "" },
    { enabled: !!selectedDocId }
  );

  useEffect(() => {
    if (docsQuery.data) setDocuments(docsQuery.data);
  }, [docsQuery.data]);

  const handleDocFile = async (file: File | undefined) => {
    setUploadError(null);
    setDocInfo(null);
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'pdf' && ext !== 'txt') {
      setUploadError('Only PDF and TXT files supported');
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const content = btoa(binary);
      const result = await uploadDoc.mutateAsync({ name: file.name, content });
      setDocInfo(result);
      setSelectedDocId(result.docId);
      setSubmittedDocQuery(null);
      docsQuery.refetch();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (file: File | undefined) => {
    setError(null);
    setGraphData(null);
    setFileName(null);
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      if (!text.trim()) {
        setError("No test results found");
        return;
      }
      try {
        const json = JSON.parse(text);
        if (!validateData(json)) {
          setError('Invalid format. Expected array of { category: string, passed: number, failed: number, severity?: number }');
          return;
        }
        setGraphData(transformToGraph(json));
      } catch {
        setError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <p className="font-mono text-xs tracking-[0.15em] text-[#6B6B6B]">&lt; VISUALIZATION /&gt;</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">GRAPH EXPLORER</h1>
          <p className="mt-2 font-mono text-[11px] text-[#6B6B6B]">UPLOAD TEST RESULTS TO VISUALIZE ATTACK CASCADE GRAPHS</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3 space-y-4">
            <div className="border border-[#2A2A2A] bg-[#121212] p-5 space-y-4">
              <p className="font-mono text-[11px] text-[#6B6B6B] tracking-[0.05em]">DATA SOURCE</p>
              <label
                htmlFor="json-upload"
                className="flex flex-col items-center justify-center gap-3 border border-dashed border-[#2A2A2A] bg-[#0A0A0A] p-8 cursor-pointer hover:border-[#E61919]/40 transition-colors"
              >
                <UploadIcon className="h-8 w-8 text-[#2A2A2A]" />
                <span className="font-mono text-[10px] text-[#6B6B6B] text-center">
                  {fileName ? fileName.toUpperCase() : "CLICK TO UPLOAD .JSON"}
                </span>
              </label>
              <input
                ref={inputRef}
                id="json-upload"
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {graphData && (
                <p className="font-mono text-[10px] text-[#4AF626]">
                  LOADED: {graphData.nodes.length} NODES, {graphData.edges.length} EDGES
                </p>
              )}
              {error && (
                <p className="font-mono text-[10px] text-[#E61919]">
                  ERROR: {error}
                </p>
              )}
            </div>

            <div className="border border-[#2A2A2A] bg-[#121212] p-5 space-y-2">
              <p className="font-mono text-[11px] text-[#6B6B6B] tracking-[0.05em]">EXPECTED FORMAT</p>
              <pre className="font-mono text-[10px] text-[#3A3A3A] leading-relaxed whitespace-pre-wrap">
{`[
  {
    "category": "Jailbreak",
    "passed": 12,
    "failed": 8,
    "severity": 2
  },
  {
    "category": "Prompt Injection",
    "passed": 5,
    "failed": 15,
    "severity": 3
  }
]`}
              </pre>
              <p className="font-mono text-[10px] text-[#3A3A3A] mt-3">
                SEVERITY IS OPTIONAL. NODES ARE GROUPED BY CATEGORY. EDGES ARE DERIVED FROM PASS RATE SIMILARITY.
              </p>
            </div>

            <div className="border border-[#2A2A2A] bg-[#121212] p-5 space-y-4">
              <p className="font-mono text-[11px] text-[#6B6B6B] tracking-[0.05em]">DOCUMENT UPLOAD</p>
              <label
                htmlFor="doc-upload"
                className="flex flex-col items-center justify-center gap-3 border border-dashed border-[#2A2A2A] bg-[#0A0A0A] p-8 cursor-pointer hover:border-[#E61919]/40 transition-colors"
              >
                <FileIcon className="h-8 w-8 text-[#2A2A2A]" />
                <span className="font-mono text-[10px] text-[#6B6B6B] text-center">
                  {uploading ? "UPLOADING..." : "CLICK TO UPLOAD .PDF / .TXT"}
                </span>
              </label>
              <input
                ref={docInputRef}
                id="doc-upload"
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleDocFile(e.target.files?.[0])}
              />
              {uploadError && (
                <p className="font-mono text-[10px] text-[#E61919]">ERROR: {uploadError}</p>
              )}
              {(docInfo || documents.length > 0) && (
                <div className="space-y-2">
                  {docInfo && (
                    <p className="font-mono text-[10px] text-[#4AF626]">
                      LOADED: {docInfo.docName} — {docInfo.chunkCount} CHUNKS
                    </p>
                  )}
                  {documents.length > 1 ? (
                    <select
                      value={selectedDocId ?? ''}
                      onChange={(e) => {
                        setSelectedDocId(e.target.value || null);
                        setSubmittedDocQuery(null);
                      }}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-[#EAEAEA] font-mono text-[10px] p-2 outline-none focus:border-[#E61919]"
                    >
                      {!selectedDocId && <option value="">SELECT DOCUMENT</option>}
                      {documents.map(d => (
                        <option key={d.docId} value={d.docId}>{d.docName} ({d.nodeCount} chunks)</option>
                      ))}
                    </select>
                  ) : selectedDocId ? (
                    <p className="font-mono text-[10px] text-[#4AF626]">DOCUMENT SELECTED — SEARCH BELOW</p>
                  ) : docInfo && (
                    <p className="font-mono text-[10px] text-[#6B6B6B]">DOCUMENT LOADED — TYPE A SEARCH QUERY BELOW</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-9 border border-[#2A2A2A] bg-[#121212] p-6 min-h-[500px] flex items-center justify-center">
            {graphData ? (
              <DemoCascadeGraph data={graphData} />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#2A2A2A] bg-[#0A0A0A] w-full min-h-[400px]">
                <div className="relative mb-4">
                  <svg width="60" height="60" viewBox="0 0 60 60" className="opacity-20">
                    <circle cx="30" cy="15" r="5" fill="#E61919" />
                    <circle cx="15" cy="40" r="5" fill="#f59e0b" />
                    <circle cx="45" cy="40" r="5" fill="#60a5fa" />
                    <circle cx="30" cy="50" r="5" fill="#a78bfa" />
                    <line x1="30" y1="15" x2="15" y2="40" stroke="#E61919" strokeWidth="1" opacity="0.4" />
                    <line x1="30" y1="15" x2="45" y2="40" stroke="#E61919" strokeWidth="1" opacity="0.4" />
                    <line x1="15" y1="40" x2="30" y2="50" stroke="#f59e0b" strokeWidth="1" opacity="0.4" />
                    <line x1="45" y1="40" x2="30" y2="50" stroke="#60a5fa" strokeWidth="1" opacity="0.4" />
                  </svg>
                </div>
                <p className="font-mono text-xs text-[#6B6B6B] tracking-[0.05em]">NO DATA LOADED</p>
                <p className="font-mono text-[10px] text-[#3A3A3A] mt-1">Upload a JSON file of test results to generate the graph</p>
              </div>
            )}
          </div>
        </div>

        <div className="border border-[#2A2A2A] bg-[#121212] p-5 space-y-4">
          <p className="font-mono text-[11px] text-[#6B6B6B] tracking-[0.05em]">ASK THE GRAPH</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!question.trim()) return;
              setSubmittedQuestion(question);
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Show me the failure cascade summary"
              className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] text-[#EAEAEA] font-mono text-sm p-2.5 outline-none focus:border-[#E61919] transition-colors"
            />
            <button
              type="submit"
              disabled={!question.trim() || queryResult.isLoading}
              className="border border-[#2A2A2A] bg-[#0A0A0A] px-5 font-mono text-[11px] tracking-[0.1em] text-[#EAEAEA] hover:border-[#E61919] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {queryResult.isLoading ? (
                <span className="flex items-center gap-2">
                  <ReloadIcon className="h-3 w-3 animate-spin" />
                  QUERYING
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ReaderIcon className="h-3 w-3" />
                  ASK
                </span>
              )}
            </button>
          </form>

          {queryResult.isLoading && (
            <div className="border border-[#2A2A2A] bg-[#0A0A0A] p-4">
              <p className="font-mono text-[11px] text-[#4AF626] animate-pulse">QUERYING THE GRAPH...</p>
            </div>
          )}

          {queryResult.error && (
            <div className="border border-[#E61919]/20 bg-[#0A0A0A] p-4">
              <p className="font-mono text-[11px] text-[#E61919]">
                ERROR: {queryResult.error.message.includes("AuraNotConfiguredError")
                  ? "Graph querying requires AuraDB — configure in Settings"
                  : queryResult.error.message}
              </p>
            </div>
          )}

          {queryResult.data && !queryResult.isLoading && (
            <div className="border border-[#2A2A2A] bg-[#0A0A0A] p-4">
              <p className="font-mono text-[10px] text-[#6B6B6B] tracking-[0.05em] mb-2">[ RESPONSE ]</p>
              <pre className="font-mono text-[12px] text-[#EAEAEA] leading-relaxed whitespace-pre-wrap">
                {queryResult.data.response}
              </pre>
            </div>
          )}
        </div>

        {selectedDocId && (
          <div className="border border-[#2A2A2A] bg-[#121212] p-5 space-y-4">
            <p className="font-mono text-[11px] text-[#6B6B6B] tracking-[0.05em]">SEARCH DOCUMENT</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!docQuery.trim()) return;
                setSubmittedDocQuery(docQuery);
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={docQuery}
                onChange={(e) => setDocQuery(e.target.value)}
                placeholder="Search within document..."
                className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] text-[#EAEAEA] font-mono text-sm p-2.5 outline-none focus:border-[#E61919] transition-colors"
              />
              <button
                type="submit"
                disabled={!docQuery.trim() || docQueryResult.isLoading}
                className="border border-[#2A2A2A] bg-[#0A0A0A] px-5 font-mono text-[11px] tracking-[0.1em] text-[#EAEAEA] hover:border-[#E61919] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {docQueryResult.isLoading ? (
                  <span className="flex items-center gap-2">
                    <ReloadIcon className="h-3 w-3 animate-spin" />
                    SEARCHING
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <MagnifyingGlassIcon className="h-3 w-3" />
                    SEARCH
                  </span>
                )}
              </button>
            </form>

            {docQueryResult.isLoading && (
              <div className="border border-[#2A2A2A] bg-[#0A0A0A] p-4">
                <p className="font-mono text-[11px] text-[#4AF626] animate-pulse">SEARCHING DOCUMENT...</p>
              </div>
            )}

            {docQueryResult.error && (
              <div className="border border-[#E61919]/20 bg-[#0A0A0A] p-4">
                <p className="font-mono text-[11px] text-[#E61919]">ERROR: {docQueryResult.error.message}</p>
              </div>
            )}

            {docQueryResult.data && !docQueryResult.isLoading && (
              <div className="space-y-3">
                {(docQueryResult.data as any).message ? (
                  <div className="border border-[#2A2A2A] bg-[#0A0A0A] p-4">
                    <p className="font-mono text-[11px] text-[#6B6B6B]">{(docQueryResult.data as any).message}</p>
                  </div>
                ) : (
                  (docQueryResult.data.results as Array<{ chunkIndex: number; text: string; score: number }>).map((r, i) => (
                    <div key={i} className="border border-[#2A2A2A] bg-[#0A0A0A] p-4 space-y-1">
                      <div className="flex justify-between items-center">
                        <p className="font-mono text-[10px] text-[#6B6B6B]">CHUNK #{r.chunkIndex + 1}</p>
                        <p className="font-mono text-[10px] text-[#f59e0b]">{(r.score * 100).toFixed(0)}% MATCH</p>
                      </div>
                      <p className="font-mono text-[11px] text-[#EAEAEA] leading-relaxed line-clamp-4">
                        {r.text.slice(0, 500)}{r.text.length > 500 ? '...' : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
