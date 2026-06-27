import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import CascadeGraph from "@/components/CascadeGraph";
import { useRef, useState } from "react";
import { ReloadIcon, DownloadIcon, ArrowLeftIcon, ColorWheelIcon } from "@radix-ui/react-icons";
import { wilsonCI, formatCI, computeCompositeScore, getLetterGrade } from "@/_core/stats";
import { type PIISpan } from "@/_core/pii";
import { classifyConfidence, getConfidenceBadge, getConfidenceLabel } from "@/_core/trust";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);
// Inline PII span highlighting — renders response text with PII spans
// highlighted at their exact byte positions, matching privacy-filter.cpp's
// span-position accuracy requirement.
function HighlightedResponse({ text, spans }: { text: string; spans?: PIISpan[] }) {
  if (!spans || spans.length === 0) {
    return <span>{text}</span>;
  }

  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < sorted.length; i++) {
    const span = sorted[i];
    // Skip invalid or overlapping spans
    if (span.start < lastEnd || span.start >= text.length) continue;
    const end = Math.min(span.end, text.length);

    if (span.start > lastEnd) {
      parts.push(<span key={`t-${i}`}>{text.slice(lastEnd, span.start)}</span>);
    }
    parts.push(
      <span
        key={`pii-${i}`}
        className="bg-[#E61919]/15 border-b-2 border-[#E61919] text-[#FF4444] relative group cursor-help"
        title={`${span.label} [${span.start}:${end}]`}
      >
        {text.slice(span.start, end)}
        <span className="absolute -top-5 left-0 hidden group-hover:block bg-[#E61919] text-[#0A0A0A] px-1 py-0.5 font-mono text-[8px] font-bold whitespace-nowrap z-10">
          {span.label} @{span.start}–{end}
        </span>
      </span>
    );
    lastEnd = end;
  }

  if (lastEnd < text.length) {
    parts.push(<span key="tail">{text.slice(lastEnd)}</span>);
  }

  return <>{parts}</>;
}

export default function TestRunDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [colorBy, setColorBy] = useState<"category" | "community">("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const testRunId = parseInt(params?.id || "0");
  const detailRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);

  const { data: testRun, isLoading } = trpc.testRuns.get.useQuery(
    { testRunId },
    { refetchInterval: 2000 }
  );
  const { data: results = [] } = trpc.testRuns.getResults.useQuery({ testRunId });
  const { data: cascades = [] } = trpc.testRuns.getCascades.useQuery({ testRunId });
  const { data: neoCascades } = trpc.testRuns.getNeoCascades.useQuery(
    { testRunId },
    { enabled: !!testRun && testRun.status !== "pending", refetchInterval: 3000 }
  );

  const reportQuery = trpc.testRuns.report.useQuery(
    { testRunId },
    { enabled: false }
  );

  const reportHtmlQuery = trpc.testRuns.reportHtml.useQuery(
    { testRunId },
    { enabled: false }
  );

  const jsonQuery = trpc.testRuns.exportJson.useQuery(
    { testRunId },
    { enabled: false }
  );

  const rerunMutation = trpc.testRuns.create.useMutation();
  const prevRunQuery = trpc.testRuns.list.useQuery({
    limit: 2,
    offset: 0,
    agentId: (testRun as any)?.agentId,
  }, { enabled: !!testRun });
  const prevRunId = prevRunQuery.data?.find(r => r.id !== testRunId)?.id;
  const graphComparisonQuery = trpc.testRuns.compareGraph.useQuery(
    { runIdA: prevRunId!, runIdB: testRunId },
    { enabled: !!prevRunId }
  );

  const handleRerun = async () => {
    try {
      const r = await rerunMutation.mutateAsync({
        agentId: (testRun as any).agentId,
        config: {},
      });
      setLocation(`/run/${r.testRunId}`);
    } catch {}
  };

  const handleExportMarkdown = async () => {
    const { data } = await reportQuery.refetch();
    if (!data) return;
    const blob = new Blob([data], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentguard-run-${testRunId}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    const { data } = await reportHtmlQuery.refetch();
    if (!data) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(data);
    w.document.close();
    w.addEventListener("afterprint", () => w.close(), { once: true });
    setTimeout(() => { w.print(); w.focus(); }, 100);
  };

  const handleExportJson = async () => {
    const { data } = await jsonQuery.refetch();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentguard-run-${testRunId}-audit.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useGSAP(() => {
    // Score counter animation
    if (testRun && scoreRef.current) {
      const targetScore = testRun.totalTests > 0 ? (testRun.passedTests / testRun.totalTests * 100) : 0;
      const el = scoreRef.current;
      gsap.fromTo(el, 
        { innerHTML: 0 },
        {
          innerHTML: targetScore,
          duration: 1.5,
          ease: "power2.out",
          onUpdate: function() {
            el.innerHTML = Number(this.targets()[0].innerHTML).toFixed(1);
          }
        }
      );
    }
  }, { dependencies: [testRun], scope: detailRef });

  useGSAP(() => {
    // Drawer slide-in
    if (selectedCategory && drawerRef.current) {
      gsap.fromTo(drawerRef.current, 
        { x: "100%" }, 
        { x: "0%", duration: 0.4, ease: "power3.out" }
      );
      
      const overlay = drawerRef.current.parentElement?.querySelector('.absolute.inset-0');
      if (overlay) {
        gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      }
    }
  }, { dependencies: [selectedCategory], scope: detailRef });

  useGSAP(() => {
    // Results list stagger animation
    const cards = document.querySelectorAll("[data-result-card]");
    if (cards.length > 0) {
      gsap.fromTo(cards,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, { dependencies: [results.length], scope: detailRef });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="loading-skeleton h-8 w-64" />
          <div className="loading-skeleton h-40 w-full" />
          <div className="loading-skeleton h-32 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!testRun) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <p className="font-mono text-sm text-[#6B6B6B]">TEST RUN NOT FOUND</p>
        </div>
      </DashboardLayout>
    );
  }

  const statusColor = ({
    pending: "text-[#6B6B6B]",
    running: "text-[#4AF626]",
    completed: "text-[#EAEAEA]",
    failed: "text-[#E61919]",
    cancelled: "text-[#6B6B6B]",
  } as Record<string, string>)[testRun.status] || "text-[#6B6B6B]";

  // Compute validation summary across all results
  const validationSummary = (() => {
    let confirmed = 0, flaky = 0, total = 0;
    for (const r of results) {
      if (!(r as any).details) continue;
      try {
        const d = JSON.parse((r as any).details);
        const v = d.validation || [];
        total += v.length;
        confirmed += v.filter((x: any) => x.status === "confirmed").length;
        flaky += v.filter((x: any) => x.status === "flaky").length;
      } catch { /* skip */ }
    }
    return { confirmed, flaky, total };
  })();

  return (
    <DashboardLayout>
      <div ref={detailRef} className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setLocation("/runs")} className="gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              [ BACK ]
            </Button>
            <div>
              <h1 className="font-display text-4xl font-black uppercase tracking-[-0.03em]">RUN #{testRunId}</h1>
              <p className={`font-mono text-xs tracking-[0.1em] ${statusColor}`}>
                &lt; {testRun.status.toUpperCase()} &gt;
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prevRunId && <Button variant="outline" size="sm" onClick={() => graphComparisonQuery.refetch()}>
              {graphComparisonQuery.isFetching ? "..." : "[ VS PREV ]"}
            </Button>}
            <Button variant="outline" size="sm" onClick={handleRerun} disabled={rerunMutation.isPending}>
              {rerunMutation.isPending ? "..." : "[ RE-RUN ]"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportJson} disabled={jsonQuery.isFetching}>
              {jsonQuery.isFetching ? "..." : "[ JSON ]"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportMarkdown} disabled={reportQuery.isFetching}>
              <DownloadIcon className="h-4 w-4" />
              {reportQuery.isFetching ? "EXPORTING..." : "[ EXPORT ]"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportPdf} disabled={reportHtmlQuery.isFetching}>
              <DownloadIcon className="h-4 w-4" />
              {reportHtmlQuery.isFetching ? "..." : "[ PDF ]"}
            </Button>
          </div>
        </div>

        <Card data-score className="p-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div>
              <p className="mb-2 font-mono text-xs tracking-[0.1em] text-[#6B6B6B]">[ SYSTEM SCORE ]</p>
              <div className="font-display text-7xl font-black text-[#EAEAEA] flex items-baseline gap-1">
                <span ref={scoreRef}>{testRun.totalTests > 0 ? (testRun.passedTests / testRun.totalTests * 100).toFixed(1) : "0.0"}</span>
                <sub className="font-mono text-sm text-[#6B6B6B]">/100</sub>
              </div>
              {testRun.totalTests > 0 && (() => {
                const ci = wilsonCI(testRun.passedTests, testRun.totalTests);
                return (
                  <p className="mt-1 font-mono text-[10px] text-[#6B6B6B]">
                    95% CI: {formatCI(ci)} | {testRun.totalTests} TESTS
                  </p>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <div className="text-center border-r border-[#2A2A2A] pr-6">
                <p className="font-display text-3xl font-black">{testRun.totalTests}</p>
                <p className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B6B]">TOTAL TESTS</p>
              </div>
              <div className="text-center border-r border-[#2A2A2A] pr-6">
                <p className="font-display text-3xl font-black text-[#EAEAEA]">{testRun.passedTests}</p>
                <p className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B6B]">PASSED</p>
              </div>
              <div className="text-center border-r border-[#2A2A2A] pr-6">
                <p className="font-display text-3xl font-black text-[#E61919]">{testRun.failedTests}</p>
                <p className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B6B]">FAILED</p>
              </div>
              {validationSummary.total > 0 && (
                <div className="text-center">
                  <p className="font-display text-3xl font-black text-[#FFA500]">{validationSummary.confirmed}</p>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B6B]">CONFIRMED</p>
                  <p className="font-mono text-[9px] text-[#FFA500] mt-0.5">
                    {validationSummary.flaky} FLAKY
                  </p>
                </div>
              )}
            </div>
          </div>

          {testRun.status === "running" && (
            <div className="mt-6 border-t border-[#2A2A2A] pt-6">
              <div className="flex items-center gap-2">
                <ReloadIcon className="h-4 w-4 animate-spin text-[#4AF626]" />
                <span className="font-mono text-xs text-[#4AF626] tracking-[0.08em]">RUNNING...</span>
              </div>
              <div className="mt-4 h-2 border border-[#2A2A2A] bg-[#0A0A0A]">
                <div
                  className="h-full bg-[#4AF626] transition-all"
                  style={{
                    width: `${testRun.totalTests > 0 ? ((testRun.passedTests + testRun.failedTests) / testRun.totalTests) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </Card>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-xs tracking-[0.15em] text-[#6B6B6B]">[ CATEGORY BREAKDOWN ]</p>
          </div>
          <div data-results className="space-y-[1px] bg-[#2A2A2A]">
            {results.map((result) => {
              const total = result.passed + result.failed;
              const ci = total > 0 ? wilsonCI(result.passed, total) : null;
              return (
                <Card
                  key={result.id}
                  data-result-card
                  className="card-hover bg-[#121212] p-6 border-0 cursor-pointer"
                  onClick={() => setSelectedCategory(result.category)}
                >
                  <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex-1">
                      <h3 className="font-mono text-sm font-semibold tracking-[0.05em]">{result.category}</h3>
                      <p className="font-mono text-[11px] text-[#6B6B6B]">
                        {result.passed} PASSED &bull; {result.failed} FAILED
                        {ci && <span className="ml-2 text-[#4A4A4A]">({formatCI(ci)})</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-display text-2xl font-black">
                          {total > 0 ? Math.round((result.passed / total) * 100) : 0}%
                        </p>
                        <p className="font-mono text-[10px] text-[#6B6B6B]">PASS RATE</p>
                      </div>
                      {(() => {
                        if (!result.details) return null;
                        try {
                          const d = JSON.parse(result.details);
                          const tests: any[] = d.tests || [];
                          const piiCount = tests.filter((t: any) => t.pii?.length > 0).length;
                          const valCount = (d.validation || []).length;
                          const confirmedCount = (d.validation || []).filter((v: any) => v.status === "confirmed").length;
                          return (
                            <>
                              {piiCount > 0 && (
                                <span className="font-mono text-[9px] text-[#E61919] border border-[#E61919]/30 px-1.5 py-0.5">
                                  {piiCount} PII
                                </span>
                              )}
                              {valCount > 0 && (
                                <span className={`font-mono text-[9px] border px-1.5 py-0.5 ${
                                  confirmedCount > 0
                                    ? "text-[#FFA500] border-[#FFA500]/30"
                                    : "text-[#4AF626] border-[#4AF626]/30"
                                }`}>
                                  {confirmedCount}/{valCount} CONFIRMED
                                </span>
                              )}
                            </>
                          );
                        } catch { return null; }
                      })()}
                      <span className={`badge ${
                        result.severity === "critical"
                          ? "badge-critical"
                          : result.severity === "high"
                            ? "badge-high"
                            : result.severity === "medium"
                              ? "badge-medium"
                              : "badge-low"
                      }`}>
                        {result.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const tier = classifyConfidence(result.passed, result.passed + result.failed);
                    const { label, color } = getConfidenceBadge(tier);
                    return (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#2A2A2A]/50">
                        <span className="font-mono text-[9px] text-[#6B6B6B]">CALIPER TIER</span>
                        <span className="font-mono text-[9px] font-bold px-2 py-0.5 border" style={{ borderColor: color + "40", backgroundColor: color + "10", color }}>
                          {label}
                        </span>
                        <span className="font-mono text-[8px] text-[#6B6B6B]">{getConfidenceLabel(tier)}</span>
                      </div>
                    );
                  })()}
                </Card>
              );
            })}
          </div>
        </div>

        {neoCascades && neoCascades.nodes.length > 0 && (
          <div data-graph>
            <p className="font-mono mb-4 text-xs tracking-[0.15em] text-[#6B6B6B]">[ CASCADE ANALYSIS ]</p>
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[11px] text-[#6B6B6B]">
                  {neoCascades.edges.length} CASCADE RELATIONSHIP{neoCascades.edges.length !== 1 ? "S" : ""} DETECTED
                </p>
                <button
                  onClick={() => setColorBy(c => c === "category" ? "community" : "category")}
                  className="flex items-center gap-1 border border-[#2A2A2A] px-2 py-1 font-mono text-[10px] text-[#6B6B6B] hover:text-[#EAEAEA] hover:border-[#E61919]"
                >
                  <ColorWheelIcon className="h-3 w-3" />
                  COLOR BY {colorBy === "category" ? "COMMUNITY" : "CATEGORY"}
                </button>
              </div>
              <CascadeGraph
                nodes={neoCascades.nodes}
                edges={neoCascades.edges}
                colorBy={colorBy}
                onNodeClick={(cat) => setSelectedCategory(cat)}
              />
            </Card>
          </div>
        )}

        <Card data-meta className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B6B]">[ STARTED ]</p>
              <p className="mt-1 font-mono text-sm">
                {testRun.startedAt
                  ? new Date(testRun.startedAt).toLocaleString()
                  : "NOT STARTED"}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B6B]">[ COMPLETED ]</p>
              <p className="mt-1 font-mono text-sm">
                {testRun.completedAt
                  ? new Date(testRun.completedAt).toLocaleString()
                  : "IN PROGRESS"}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B6B]">[ DURATION ]</p>
              <p className="mt-1 font-mono text-sm">
                {testRun.startedAt && testRun.completedAt
                  ? `${Math.round((new Date(testRun.completedAt).getTime() - new Date(testRun.startedAt).getTime()) / 1000)}s`
                  : "---"}
              </p>
            </div>
          </div>
        </Card>

        {prevRunId && graphComparisonQuery.data && (
          <Card className="p-6">
            <p className="font-mono mb-4 text-xs tracking-[0.15em] text-[#6B6B6B]">[ RUN #{prevRunId} DELTA ]</p>
            {graphComparisonQuery.data.deltas.length === 0 ? (
              <p className="font-mono text-[11px] text-[#6B6B6B] italic">No graph delta available (Neo4j may be offline).</p>
            ) : (
              <div className="space-y-2">
                {graphComparisonQuery.data.deltas.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-[#0A0A0A] border border-[#2A2A2A] p-2 font-mono text-[10px]">
                    {d.change === "new" && <span className="text-[#4AF626] font-bold">+NODE</span>}
                    {d.change === "missing" && <span className="text-[#E61919] font-bold">-NODE</span>}
                    {d.change === "edge_new" && <span className="text-[#AAE6FF] font-bold">+EDGE</span>}
                    {d.change === "edge_missing" && <span className="text-[#FFA500] font-bold">-EDGE</span>}
                    {d.change === "community_shift" && <span className="text-[#FF69B4] font-bold">≈ COM</span>}
                    <span className="text-[#EAEAEA]">{d.category || d.id || d.sourceResultId}{d.targetResultId ? ` → ${d.targetResultId}` : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Side Inspect Drawer overlay */}
        {selectedCategory && (() => {
          const activeResult = results.find(r => r.category === selectedCategory);
          if (!activeResult) return null;

          let testCases: Array<any> = [];
          let validation: Array<any> = [];
          let gates: any[] = [];
          let totalTokens = 0;
          let judgeKappa: number | undefined;
          let judgeUnstable = false;
          if (activeResult.details) {
            try {
              const parsed = JSON.parse(activeResult.details);
              testCases = parsed.tests || parsed.attacks?.map((a: string) => ({
                prompt: a,
                response: "N/A (Legacy attack record)",
                passed: false,
                reasoning: "Detailed logs are only available for newly generated test cases."
              })) || [];
              validation = parsed.validation || [];
              gates = parsed.gates || [];
              totalTokens = testCases.reduce((sum, tc) => sum + (tc.tokens?.used || (tc.response ? tc.response.length : 0)), 0);
              // Extract judge reliability from first test case with model verdicts
              const firstWithVerdicts = testCases.find(tc => tc.modelVerdicts?.length > 0);
              if (firstWithVerdicts?.kappa != null) judgeKappa = firstWithVerdicts.kappa;
              if (firstWithVerdicts?.unstable) judgeUnstable = true;
            } catch (e) {
              console.error("Failed to parse details", e);
            }
          }

          const catTotal = activeResult.passed + activeResult.failed;
          const catCI = catTotal > 0 ? wilsonCI(activeResult.passed, catTotal) : null;

          return (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
              <div className="absolute inset-0" onClick={() => setSelectedCategory(null)} />
              
              <div ref={drawerRef} className="relative w-full max-w-2xl bg-[#121212] border-l border-[#2A2A2A] h-full flex flex-col shadow-2xl p-6 md:p-8 will-change-transform">
                <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-[#6B6B6B] tracking-[0.1em]">[ CATEGORY DETAIL ]</span>
                      {judgeKappa != null && (
                        <span className={`font-mono text-[9px] px-1.5 py-0.5 border ${judgeUnstable ? "border-[#E61919] text-[#E61919]" : judgeKappa >= 0.6 ? "border-[#4AF626] text-[#4AF626]" : "border-[#F59E0B] text-[#F59E0B]"}`}>
                          κ={judgeKappa}{judgeUnstable ? " UNSTABLE" : judgeKappa >= 0.6 ? " STABLE" : ""}
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-2xl font-black uppercase tracking-tight mt-1 text-[#EAEAEA]">{selectedCategory}</h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCategory(null)}>
                    [ CLOSE ]
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                  <div className="flex items-center justify-between bg-[#0A0A0A] border border-[#2A2A2A] p-4 font-mono text-xs">
                    <div>
                      <span className="text-[#6B6B6B] block">TOTAL TESTS</span>
                      <span className="text-[#EAEAEA] font-semibold mt-0.5 block">{catTotal}</span>
                    </div>
                    <div>
                      <span className="text-[#6B6B6B] block">PASSED / FAILED</span>
                      <span className="text-[#EAEAEA] font-semibold mt-0.5 block text-right">{activeResult.passed} / {activeResult.failed}</span>
                    </div>
                    <div>
                      <span className="text-[#6B6B6B] block">RELIABILITY</span>
                      {catCI ? (
                        <span className="text-[#4AF626] font-semibold mt-0.5 block text-right" title={formatCI(catCI)}>
                          {(catCI.point * 100).toFixed(1)}% ± {(catCI.interval * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[#4AF626] font-semibold mt-0.5 block text-right">0%</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[#6B6B6B] block">COMPOSITE</span>
                      <span className="text-[#4AF626] font-semibold mt-0.5 block text-right">
                        {(() => { const c = computeCompositeScore({ passRate: catTotal > 0 ? activeResult.passed / catTotal : 0, severity: activeResult.severity }); return `${(c * 100).toFixed(0)}% ${getLetterGrade(c)}`; })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6B6B] block" title="Average response length in characters">AVG BLOAT</span>
                      <span className="text-[#E61919] font-semibold mt-0.5 block text-right">
                        {testCases.length > 0 ? Math.round(totalTokens / testCases.length) : 0} CHRS
                      </span>
                    </div>
                  </div>

                  {catCI && (
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A]/50 p-3 font-mono text-[10px]">
                      <div className="flex items-center gap-3">
                        <span className="text-[#6B6B6B] shrink-0">95% CI</span>
                        <div className="flex-1 h-2.5 bg-[#1A1A1A] relative rounded-full overflow-hidden">
                          <div className="absolute inset-y-0 bg-[#4AF626]/20 rounded-full" style={{ left: `${catCI.lower * 100}%`, width: `${(catCI.upper - catCI.lower) * 100}%` }} />
                          <div className="absolute inset-y-0 w-0.5 bg-[#EAEAEA] -translate-x-1/2" style={{ left: `${catCI.point * 100}%` }} />
                        </div>
                        <span className="text-[#EAEAEA] shrink-0">{formatCI(catCI)}</span>
                        <span className="text-[#4A4A4A] shrink-0">({catTotal})</span>
                      </div>
                      <div className="flex gap-3 mt-1.5">
                        <span className={`text-[9px] ${judgeKappa != null ? judgeKappa >= 0.6 ? "text-[#4AF626]" : "text-[#F59E0B]" : "text-[#6B6B6B]"}`}>
                          κ={judgeKappa?.toFixed(2) ?? "—"}
                        </span>
                        <span className={`text-[9px] ${(judgeKappa != null && judgeKappa >= 0.6) ? "text-[#4AF626]" : "text-[#6B6B6B]"}`}>
                          {judgeUnstable ? "UNSTABLE" : judgeKappa != null && judgeKappa >= 0.6 ? "STABLE" : "—"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <span className="font-mono text-[10px] text-[#6B6B6B] tracking-[0.1em] block">[ TEST CASES ]</span>
                    {testCases.length === 0 ? (
                      <p className="font-mono text-xs text-[#6B6B6B] italic">No detailed test cases found for this category.</p>
                    ) : (
                      testCases.map((tc, idx) => (
                        <Card key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] p-4 space-y-3 rounded-none">
                          <div className="flex items-center justify-between border-b border-[#2A2A2A]/50 pb-2">
                            <span className="font-mono text-[10px] text-[#6B6B6B]">CASE #{idx + 1}</span>
                            <div className="flex items-center gap-2">
                              {tc.pii && tc.pii.length > 0 && (
                                <span className="font-mono text-[9px] text-[#E61919] border border-[#E61919]/30 bg-[#E61919]/5 px-1.5 py-0.5">
                                  {tc.pii.length} PII SPAN{tc.pii.length !== 1 ? "S" : ""}
                                </span>
                              )}
                              {tc.passed ? (
                                <span className="font-mono text-[9px] font-bold text-[#4AF626] border border-[#4AF626]/20 bg-[#4AF626]/5 px-2 py-0.5">
                                  [ PASSED ]
                                </span>
                              ) : (
                                <span className="font-mono text-[9px] font-bold text-[#E61919] border border-[#E61919]/20 bg-[#E61919]/5 px-2 py-0.5">
                                  [ COMPROMISED ]
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-3 text-xs font-mono">
                            <div>
                              <span className="text-[#6B6B6B] block mb-1">[ ATTACK PROMPT ]</span>
                              <p className="text-[#EAEAEA] bg-[#121212]/50 p-2.5 border border-[#2A2A2A]/30 whitespace-pre-wrap leading-relaxed">{tc.prompt}</p>
                            </div>
                            <div>
                              <span className="text-[#6B6B6B] block mb-1">
                                [ AGENT RESPONSE ]
                                {tc.pii && tc.pii.length > 0 && (
                                  <span className="text-[#E61919] ml-2">⚠ PII DETECTED</span>
                                )}
                              </span>
                              <p className="text-[#EAEAEA] bg-[#121212]/50 p-2.5 border border-[#2A2A2A]/30 whitespace-pre-wrap leading-relaxed">
                                <HighlightedResponse text={tc.response} spans={tc.pii} />
                              </p>
                              {tc.pii && tc.pii.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {tc.pii.map((pii: any, pi: number) => (
                                    <span key={pi} className="inline-flex items-center gap-1 border border-[#E61919]/30 bg-[#E61919]/5 px-1.5 py-0.5 font-mono text-[9px] text-[#E61919]">
                                      {pii.label} [{pii.start}:{pii.end}]
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="text-[#6B6B6B] block mb-1">[ JUDGE REASONING ]</span>
                              <p className="text-[#8E8E8E] leading-relaxed italic">{tc.reasoning || "No evaluation explanation provided."}</p>
                            </div>
                            {tc.modelVerdicts && tc.modelVerdicts.length > 0 && (
                              <div>
                                <span className="text-[#6B6B6B] block mb-1">[ MODEL VERDICTS ]</span>
                                <div className="space-y-1">
                                  {tc.modelVerdicts.map((mv: any, mi: number) => (
                                    <div key={mi} className="flex items-center justify-between bg-[#121212] border border-[#2A2A2A] px-2.5 py-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className={`font-mono text-[9px] font-bold ${mv.timedOut ? "text-[#6B6B6B]" : mv.passed ? "text-[#4AF626]" : "text-[#E61919]"}`}>
                                          {mv.timedOut ? "TIMEOUT" : mv.passed ? "PASS" : "FAIL"}
                                        </span>
                                        <span className="font-mono text-[10px] text-[#EAEAEA] font-semibold uppercase">{mv.provider}</span>
                                        <span className="font-mono text-[9px] text-[#6B6B6B]">{mv.model}</span>
                                      </div>
                                      {!mv.timedOut && (
                                        <span className="font-mono text-[9px] text-[#8E8E8E] ml-2 truncate max-w-[200px]" title={mv.reasoning}>{mv.reasoning}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {tc.tokens && (
                              <div className="pt-2 border-t border-[#2A2A2A]/50">
                                <span className="text-[#6B6B6B] block mb-1">[ CONTEXT HEALTH / TOKEN BLOAT ]</span>
                                <div className="flex items-center justify-between bg-[#121212] border border-[#2A2A2A] px-3 py-2">
                                  <div className="flex gap-4">
                                    <div>
                                      <span className="text-[#8E8E8E] text-[10px] block">TOKENS USED</span>
                                      <span className="text-[#EAEAEA] text-xs">{tc.tokens.used}</span>
                                    </div>
                                    <div>
                                      <span className="text-[#8E8E8E] text-[10px] block">TOKENS WASTED</span>
                                      <span className={`text-xs ${tc.tokens.wasted > 200 ? 'text-[#E61919] font-bold' : 'text-[#4AF626]'}`}>{tc.tokens.wasted}</span>
                                    </div>
                                  </div>
                                  {tc.tokens.wasted > 200 && (
                                    <span className="text-[#E61919] text-[9px] border border-[#E61919]/30 bg-[#E61919]/5 px-1.5 py-0.5">
                                      VERBOSE COMPLIANCE DETECTED
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>

                  {validation.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-[#6B6B6B] tracking-[0.1em] block">[ VALIDATION ]</span>
                        <div className="flex gap-2">
                          <span className="font-mono text-[9px] text-[#E61919]">
                            {validation.filter(v => v.status === "confirmed").length} CONFIRMED
                          </span>
                          <span className="font-mono text-[9px] text-[#FFA500]">
                            {validation.filter(v => v.status === "flaky").length} FLAKY
                          </span>
                        </div>
                      </div>
                      <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-4 font-mono text-xs space-y-3">
                        <p className="text-[#8E8E8E]">Independent re-run of failed findings to confirm or disprove:</p>
                        {validation.map((v, vi) => (
                          <div key={vi} className="flex items-start justify-between gap-3 border-b border-[#2A2A2A]/30 pb-2 last:border-0 last:pb-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-[#EAEAEA] truncate">{v.originalPrompt}</p>
                              <p className="text-[#6B6B6B] mt-1 text-[10px]">
                                Re-run: "{v.rephrasedPrompt.slice(0, 60)}..."
                              </p>
                            </div>
                            <span className={`shrink-0 font-mono text-[9px] font-bold px-1.5 py-0.5 ${
                              v.status === "confirmed"
                                ? "text-[#E61919] border border-[#E61919]/30 bg-[#E61919]/5"
                                : v.status === "flaky"
                                  ? "text-[#FFA500] border border-[#FFA500]/30 bg-[#FFA500]/5"
                                  : "text-[#6B6B6B] border border-[#6B6B6B]/30"
                            }`}>
                              {v.status === "confirmed" ? "CONFIRMED" : v.status === "flaky" ? "FLAKY" : v.status.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </DashboardLayout>
  );
}