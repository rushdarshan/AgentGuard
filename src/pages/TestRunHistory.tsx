import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reliabilityBadge, reliabilityLabel } from "@/const";
import { wilsonCI, formatCI } from "@/_core/stats";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function TestRunHistory() {
  const { data: testRuns = [] } = trpc.testRuns.list.useQuery({});

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterScoreMin, setFilterScoreMin] = useState<number>(0);
  const [filterScoreMax, setFilterScoreMax] = useState<number>(100);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);

  const { data: comparison } = trpc.testRuns.compareRuns.useQuery(
    { runIdA: compareA!, runIdB: compareB! },
    { enabled: !!compareA && !!compareB }
  );

  const filteredRuns = testRuns.filter((run) => {
    if (filterStatus !== "all" && run.status !== filterStatus) return false;
    const score = run.reliabilityScore || 0;
    if (score < filterScoreMin || score > filterScoreMax) return false;
    return true;
  });

  const sortedRuns = [...filteredRuns].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleCompareClick = (runId: number) => {
    if (compareA === runId) { setCompareA(null); return; }
    if (compareB === runId) { setCompareB(null); return; }
    if (!compareA) { setCompareA(runId); return; }
    if (!compareB) { setCompareB(runId); return; }
    // Both set, cycle: replace A with B, B with new
    setCompareA(compareB);
    setCompareB(runId);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const runsRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (comparison && compareRef.current) {
      gsap.fromTo(compareRef.current, 
        { y: -20, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
      );
    }
  }, { dependencies: [comparison], scope: containerRef });

  useGSAP(() => {
    const runCards = runsRef.current?.children;
    if (runCards && runCards.length > 0) {
      gsap.fromTo(runCards,
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out" }
      );
    }
  }, { dependencies: [sortedRuns], scope: containerRef });

  return (
    <DashboardLayout>
      <div ref={containerRef} className="space-y-8">
        <div>
          <p className="font-mono text-sm tracking-[0.15em] text-[#8A8A8A]">&lt; HISTORY /&gt;</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">RUN HISTORY</h1>
        </div>

        <Card className="p-6 border-2 border-[#2A2A2A]">
          <p className="telemetry-label mb-4 text-[#8A8A8A]">FILTERS</p>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label className="mb-2 block font-mono text-sm text-[#8A8A8A]">STATUS</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex h-10 w-full border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 font-mono text-base text-[#EAEAEA] focus:outline-none focus:border-[#E61919]"
              >
                <option value="all">ALL</option>
                <option value="pending">PENDING</option>
                <option value="running">RUNNING</option>
                <option value="completed">COMPLETED</option>
                <option value="failed">FAILED</option>
              </select>
            </div>
            <div>
              <Label className="mb-2 block font-mono text-sm text-[#8A8A8A]">MIN SCORE</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={filterScoreMin}
                onChange={(e) => setFilterScoreMin(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label className="mb-2 block font-mono text-sm text-[#8A8A8A]">MAX SCORE</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={filterScoreMax}
                onChange={(e) => setFilterScoreMax(parseInt(e.target.value) || 100)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => {
                setFilterStatus("all");
                setFilterScoreMin(0);
                setFilterScoreMax(100);
              }}>
                [ RESET ]
              </Button>
              <Button variant={compareMode ? "default" : "outline"} onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null); }}>
                [ COMPARE ]
              </Button>
              {(compareA || compareB) && (
                <Button variant="outline" onClick={() => { setCompareA(null); setCompareB(null); }}>
                  [ CLEAR CMP ]
                </Button>
              )}
            </div>
          </div>
        </Card>

        {compareMode && !compareA && !compareB && (
          <Card className="p-4 border border-[#E61919]/30 bg-[#E61919]/5">
            <p className="font-mono text-sm text-[#E61919]">[ COMPARE MODE: Select two runs ]</p>
            <p className="font-mono text-xs text-[#8A8A8A] mt-1">
              Click the A/B box on two runs to compare their Wilson confidence intervals. 
              Statistically separable runs (non-overlapping CIs at p&lt;0.05) are flagged SIGNIFICANT.
            </p>
          </Card>
        )}

        {/* Comparison Panel */}
        {comparison && (
          <div ref={compareRef} className="will-change-transform">
            <Card className="p-6 border-[#E61919]/30">
            <p className="telemetry-label mb-4 text-[#E61919]">RUN COMPARISON / WILSON SEPARABILITY</p>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <p className="font-mono text-sm text-[#8A8A8A]">RUN #{comparison.runA.id}</p>
                <p className="font-display text-3xl font-black text-[#EAEAEA]">
                  {(comparison.runA.ci.point * 100).toFixed(1)}%
                </p>
                <p className="font-mono text-sm text-[#8A8A8A]">
                  [{(comparison.runA.ci.lower * 100).toFixed(1)}–{(comparison.runA.ci.upper * 100).toFixed(1)}%]
                </p>
                <p className="font-mono text-sm text-[#4A4A4A] mt-1">
                  {comparison.runA.passedTests}/{comparison.runA.totalTests} tests
                </p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className={`font-mono text-base font-bold px-3 py-1 border ${
                  comparison.significant
                    ? "text-[#4AF626] border-[#4AF626]/30 bg-[#4AF626]/5"
                    : "text-[#E61919] border-[#E61919]/30 bg-[#E61919]/5"
                }`}>
                  {comparison.significant ? "SIGNIFICANT" : "NOT SIGNIFICANT"}
                </span>
                <p className="font-mono text-sm text-[#8A8A8A] mt-2 text-center">
                  {comparison.significant
                    ? "CIs dont overlap, statistically separable at p<0.05"
                    : "CIs overlap, no statistically meaningful difference"}
                </p>
              </div>
              <div className="text-center">
                <p className="font-mono text-sm text-[#8A8A8A]">RUN #{comparison.runB.id}</p>
                <p className="font-display text-3xl font-black text-[#EAEAEA]">
                  {(comparison.runB.ci.point * 100).toFixed(1)}%
                </p>
                <p className="font-mono text-sm text-[#8A8A8A]">
                  [{(comparison.runB.ci.lower * 100).toFixed(1)}–{(comparison.runB.ci.upper * 100).toFixed(1)}%]
                </p>
                <p className="font-mono text-sm text-[#4A4A4A] mt-1">
                  {comparison.runB.passedTests}/{comparison.runB.totalTests} tests
                </p>
              </div>
            </div>
          </Card>
          </div>
        )}

        {sortedRuns.length > 0 ? (
          <div ref={runsRef} className="space-y-[1px] bg-[#2A2A2A]">
            {sortedRuns.map((run, idx) => {
              const ci = run.totalTests > 0 ? wilsonCI(run.passedTests, run.totalTests) : null;
              const isSelected = compareA === run.id || compareB === run.id;
              const isFirst = idx === 0;
              return (
                  <div key={run.id} className={`bg-[#121212] will-change-transform ${isSelected ? "ring-1 ring-[#E61919]/50" : ""}`}>
                  {compareMode && <div className="flex items-center gap-2 px-6 pt-4">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCompareClick(run.id); }}
                      className={`shrink-0 w-5 h-5 border font-mono text-sm flex items-center justify-center transition-colors ${
                        isSelected
                          ? "border-[#E61919] bg-[#E61919]/10 text-[#E61919]"
                          : "border-[#2A2A2A] text-[#8A8A8A] hover:border-[#E61919]/50 hover:text-[#E61919]"
                      }`}
                      title="Select for comparison"
                    >
                      {compareA === run.id ? "A" : compareB === run.id ? "B" : ""}
                    </button>
                    <span className="font-mono text-sm text-[#8A8A8A]">COMPARE</span>
                  </div>}
                  <Link href={`/runs/${run.id}`}>
                    <div className={`card-hover border-0 ${isFirst ? "p-8 pt-2" : "p-6 pt-2"}`}>
                      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <h3 className="font-mono text-base font-semibold tracking-[0.05em]">RUN #{run.id}</h3>
                            <span className={`font-mono text-sm tracking-[0.1em] ${
                              run.status === "completed"
                                ? "text-[#EAEAEA]"
                                : run.status === "running"
                                  ? "text-[#4AF626]"
                                  : run.status === "failed"
                                    ? "text-[#E61919]"
                                    : "text-[#8A8A8A]"
                            }`}>
                              &lt; {run.status.toUpperCase()} &gt;
                            </span>
                          </div>
                          <p className="font-mono text-sm text-[#8A8A8A]">
                            {run.totalTests} TESTS &bull; {run.passedTests} PASSED &bull; {run.failedTests} FAILED
                          </p>
                          {ci && (
                            <p className="mt-0.5 font-mono text-sm text-[#4A4A4A]">
                              95% CI: {formatCI(ci)}
                            </p>
                          )}
                          <p className="mt-1 font-mono text-sm text-[#8A8A8A]">
                            {new Date(run.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-display text-2xl font-black">{run.totalTests > 0 ? (run.passedTests / run.totalTests * 100).toFixed(1) : "0"}%</p>
                          </div>
                          <span className={`badge ${reliabilityBadge(run.reliabilityScore || 0)}`}>
                            {reliabilityLabel(run.reliabilityScore || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="font-mono text-base text-[#8A8A8A]">NO TEST RUNS MATCH YOUR FILTERS</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
