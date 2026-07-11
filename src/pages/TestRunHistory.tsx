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

const EVENT_LABEL: Record<string, string> = {
  debug: "Trace event",
  info: "System event",
  warn: "Warning",
  error: "Failure detected",
};

const LEVEL_COLOR: Record<string, string> = {
  debug: "text-[#808080]/70",
  info: "text-[#808080]",
  warn: "text-[#F59E0B]",
  error: "text-[#D82C20]",
};

export default function TestRunHistory() {
  const { data: testRuns = [], isLoading } = trpc.testRuns.list.useQuery({});
  const { data: logs = [] } = trpc.system.logs.useQuery({});

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

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );

  const errorCount = sortedLogs.filter((e) => e.level === "error").length;
  const warnCount = sortedLogs.filter((e) => e.level === "warn").length;
  const completedRuns = testRuns.filter(
    (r) => r.status === "completed" && r.startedAt && r.completedAt
  );
  const avgDuration =
    completedRuns.length > 0
      ? Math.round(
          completedRuns.reduce((sum, r) => {
            const dur =
              new Date(r.completedAt!).getTime() -
              new Date(r.startedAt!).getTime();
            return sum + dur;
          }, 0) / completedRuns.length / 1000
        )
      : null;

  const handleCompareClick = (runId: number) => {
    if (compareA === runId) { setCompareA(null); return; }
    if (compareB === runId) { setCompareB(null); return; }
    if (!compareA) { setCompareA(runId); return; }
    if (!compareB) { setCompareB(runId); return; }
    setCompareA(compareB);
    setCompareB(runId);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const runsRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (comparison && compareRef.current) {
        gsap.fromTo(compareRef.current,
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
        );
      }
    });
    return () => mm.revert();
  }, { dependencies: [comparison], scope: containerRef });

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const runCards = runsRef.current?.children;
      if (runCards && runCards.length > 0) {
        gsap.fromTo(runCards,
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out" }
        );
      }
    });
    return () => mm.revert();
  }, { dependencies: [sortedRuns], scope: containerRef });

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const logRows = logsRef.current?.querySelectorAll("[data-log-row]");
      if (logRows && logRows.length > 0) {
        gsap.fromTo(logRows,
          { x: -12, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: "power2.out" }
        );
      }
    });
    return () => mm.revert();
  }, { dependencies: [sortedLogs], scope: containerRef });

  return (
    <DashboardLayout>
      <div ref={containerRef} className="space-y-8">
        <div>
          <p className="font-mono text-sm tracking-[0.15em] text-[#808080]">&lt; HISTORY /&gt;</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">RUN HISTORY</h1>
        </div>

        <Card className="p-6 border-2 border-[#2A2A2A]">
          <p className="telemetry-label mb-4 text-[#808080]">FILTERS</p>
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-4">
            <div>
              <Label className="mb-2 block font-mono text-sm text-[#808080]">STATUS</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex h-10 w-full border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 font-mono text-base text-[#F5F5F5] focus:outline-none focus:border-[#D82C20]"
              >
                <option value="all">ALL</option>
                <option value="pending">PENDING</option>
                <option value="running">RUNNING</option>
                <option value="completed">COMPLETED</option>
                <option value="failed">FAILED</option>
              </select>
            </div>
            <div>
              <Label className="mb-2 block font-mono text-sm text-[#808080]">MIN SCORE</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={filterScoreMin}
                onChange={(e) => setFilterScoreMin(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label className="mb-2 block font-mono text-sm text-[#808080]">MAX SCORE</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={filterScoreMax}
                onChange={(e) => setFilterScoreMax(parseInt(e.target.value) || 100)}
              />
            </div>
            <div className="flex items-end gap-2 flex-wrap lg:justify-end">
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

        <Card className="p-4 border border-[#2A2A2A]">
          <p className="telemetry-label mb-3 text-[#808080]">ACTIVITY SUMMARY</p>
          <div className="flex gap-8 font-mono text-sm">
            <div>
              <span className="text-[#808080]">ENTRIES </span>
              <span className="text-[#F5F5F5] font-semibold">{sortedLogs.length}</span>
            </div>
            <div>
              <span className="text-[#808080]">ERRORS </span>
              <span className="text-[#D82C20] font-semibold">{errorCount}</span>
            </div>
            <div>
              <span className="text-[#808080]">WARNINGS </span>
              <span className="text-[#F59E0B] font-semibold">{warnCount}</span>
            </div>
            {avgDuration !== null && (
              <div>
                <span className="text-[#808080]">AVG DURATION </span>
                <span className="text-[#F5F5F5] font-semibold">{avgDuration}s</span>
              </div>
            )}
          </div>
        </Card>

        {compareMode && !compareA && !compareB && (
          <Card className="p-4 border border-[#D82C20]/30 bg-[#D82C20]/5">
            <p className="font-mono text-sm text-[#D82C20]">[ COMPARE MODE: Select two runs ]</p>
            <p className="font-mono text-xs text-[#808080] mt-1">
              Click the A/B box on two runs to compare their Wilson confidence intervals.
              Statistically separable runs (non-overlapping CIs at p&lt;0.05) are flagged SIGNIFICANT.
            </p>
          </Card>
        )}

        {comparison && (
          <div ref={compareRef} className="will-change-transform">
            <Card className="p-6 border-[#D82C20]/30">
            <p className="telemetry-label mb-4 text-[#D82C20]">RUN COMPARISON / WILSON SEPARABILITY</p>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <p className="font-mono text-sm text-[#808080]">RUN #{comparison.runA.id}</p>
                <p className="font-display text-3xl font-black text-[#F5F5F5]">
                  {(comparison.runA.ci.point * 100).toFixed(1)}%
                </p>
                <p className="font-mono text-sm text-[#808080]">
                  [{(comparison.runA.ci.lower * 100).toFixed(1)}–{(comparison.runA.ci.upper * 100).toFixed(1)}%]
                </p>
                <p className="font-mono text-sm text-[#2A2A2A] mt-1">
                  {comparison.runA.passedTests}/{comparison.runA.totalTests} tests
                </p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className={`font-mono text-base font-bold px-3 py-1 border ${
                  comparison.significant
                    ? "text-[#22C55E] border-[#22C55E]/20"
                    : "text-[#D82C20] border-[#D82C20]/30 bg-[#D82C20]/5"
                }`}>
                  {comparison.significant ? "SIGNIFICANT" : "NOT SIGNIFICANT"}
                </span>
                <p className="font-mono text-sm text-[#808080] mt-2 text-center">
                  {comparison.significant
                    ? "CIs dont overlap, statistically separable at p<0.05"
                    : "CIs overlap, no statistically meaningful difference"}
                </p>
              </div>
              <div className="text-center">
                <p className="font-mono text-sm text-[#808080]">RUN #{comparison.runB.id}</p>
                <p className="font-display text-3xl font-black text-[#F5F5F5]">
                  {(comparison.runB.ci.point * 100).toFixed(1)}%
                </p>
                <p className="font-mono text-sm text-[#808080]">
                  [{(comparison.runB.ci.lower * 100).toFixed(1)}–{(comparison.runB.ci.upper * 100).toFixed(1)}%]
                </p>
                <p className="font-mono text-sm text-[#2A2A2A] mt-1">
                  {comparison.runB.passedTests}/{comparison.runB.totalTests} tests
                </p>
              </div>
            </div>
          </Card>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-[1px] bg-[#2A2A2A]">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-[#111111] p-6 animate-pulse">
                <div className="h-4 w-32 bg-[#2A2A2A] mb-2"></div>
                <div className="h-3 w-64 bg-[#2A2A2A]"></div>
              </div>
            ))}
          </div>
        ) : sortedRuns.length > 0 ? (
          <div ref={runsRef} className="space-y-[1px] bg-[#2A2A2A]">
            {sortedRuns.map((run, idx) => {
              const ci = run.totalTests > 0 ? wilsonCI(run.passedTests, run.totalTests) : null;
              const isSelected = compareA === run.id || compareB === run.id;
              const isFirst = idx === 0;
              return (
                  <div key={run.id} className={`bg-[#111111] will-change-transform ${isSelected ? "ring-1 ring-[#D82C20]/50" : ""}`}>
                  {compareMode && <div className="flex items-center gap-2 px-6 pt-4">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCompareClick(run.id); }}
                      className={`shrink-0 w-5 h-5 border font-mono text-sm flex items-center justify-center transition-colors ${
                        isSelected
                          ? "border-[#D82C20] bg-[#D82C20]/10 text-[#D82C20]"
                          : "border-[#2A2A2A] text-[#808080] hover:border-[#D82C20]/50 hover:text-[#D82C20]"
                      }`}
                      title="Select for comparison"
                    >
                      {compareA === run.id ? "A" : compareB === run.id ? "B" : ""}
                    </button>
                    <span className="font-mono text-sm text-[#808080]">COMPARE</span>
                  </div>}
                  <Link href={`/runs/${run.id}`}>
                    <div className={`card-hover border-0 ${isFirst ? "p-8 pt-2" : "p-6 pt-2"}`}>
                      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <h3 className="font-mono text-base font-semibold tracking-[0.05em]">RUN #{run.id}</h3>
                            <span className={`font-mono text-sm tracking-[0.1em] ${
                              run.status === "completed"
                                ? "text-[#F5F5F5]"
                                : run.status === "running"
                                  ? "text-[#22C55E]"
                                  : run.status === "failed"
                                    ? "text-[#D82C20]"
                                    : "text-[#808080]"
                            }`}>
                              &lt; {run.status.toUpperCase()} &gt;
                            </span>
                          </div>
                          <p className="font-mono text-sm text-[#808080]">
                            {run.totalTests} TESTS &bull; {run.passedTests} PASSED &bull; {run.failedTests} FAILED
                          </p>
                          {ci && (
                            <p className="mt-0.5 font-mono text-sm text-[#2A2A2A]">
                              95% CI: {formatCI(ci)}
                            </p>
                          )}
                          <p className="mt-1 font-mono text-sm text-[#808080]">
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
            <p className="font-mono text-base text-[#808080]">NO TEST RUNS MATCH YOUR FILTERS</p>
          </Card>
        )}

        <div>
          <p className="telemetry-label mb-4 text-[#808080]">ACTIVITY LOG</p>
          {sortedLogs.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="font-mono text-sm text-[#808080]">No logs yet — run a test to see activity</p>
            </Card>
          ) : (
            <div className="bg-[#111111] border border-[#2A2A2A]">
              <div className="grid grid-cols-[1fr_1fr_2fr_1fr] gap-4 px-4 py-2 border-b border-[#2A2A2A]">
                <span className="font-mono text-xs font-semibold tracking-[0.1em] text-[#808080] uppercase">EVENT</span>
                <span className="font-mono text-xs font-semibold tracking-[0.1em] text-[#808080] uppercase">RUN</span>
                <span className="font-mono text-xs font-semibold tracking-[0.1em] text-[#808080] uppercase">MESSAGE</span>
                <span className="font-mono text-xs font-semibold tracking-[0.1em] text-[#808080] uppercase">TIME</span>
              </div>
              <div ref={logsRef}>
                {sortedLogs.map((entry) => {
                  const ctxEntries = Object.entries(entry).filter(
                    ([k]) => !["id", "level", "msg", "ts"].includes(k)
                  );
                  return (
                    <div
                      key={entry.id}
                      data-log-row
                      className="grid grid-cols-[1fr_1fr_2fr_1fr] gap-4 px-4 py-1.5 border-b border-[#2A2A2A]/50 last:border-b-0 will-change-transform"
                    >
                      <span className={`font-mono text-xs font-semibold ${LEVEL_COLOR[entry.level] || "text-[#808080]"}`}>
                        {EVENT_LABEL[entry.level] || entry.level}
                      </span>
                      <span className="font-mono text-xs text-[#F5F5F5]/70 truncate">
                        {ctxEntries.length > 0
                          ? ctxEntries.map(([k, v]) => `${k}=${String(v)}`).join(" ")
                          : "—"}
                      </span>
                      <span className="font-mono text-xs text-[#F5F5F5] truncate">
                        {entry.msg}
                      </span>
                      <span className="font-mono text-xs text-[#808080]">
                        {new Date(entry.ts).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
