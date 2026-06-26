import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import CascadeGraph from "@/components/CascadeGraph";
import { useRef, useState } from "react";
import { ReloadIcon, DownloadIcon, ArrowLeftIcon, ColorWheelIcon } from "@radix-ui/react-icons";
import { reliabilityColor } from "@/const";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

export default function TestRunDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [colorBy, setColorBy] = useState<"category" | "community">("category");
  const testRunId = parseInt(params?.id || "0");
  const detailRef = useRef<HTMLDivElement>(null);

  useGSAP((_context, contextSafe) => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const el = detailRef.current!;

      gsap.from(el.querySelector("[data-score]"), {
        y: 40, autoAlpha: 0, scale: 0.96, duration: 0.7, ease: "power3.out",
      });

      gsap.from(el.querySelectorAll("[data-result-card]"), {
        y: 30, autoAlpha: 0, duration: 0.4, stagger: 0.08, ease: "power2.out",
        scrollTrigger: { trigger: el.querySelector("[data-results]"), start: "top 80%", toggleActions: "play none none reverse" },
      });

      gsap.from(el.querySelector("[data-graph]"), {
        y: 20, autoAlpha: 0, duration: 0.5, ease: "power2.out",
        scrollTrigger: { trigger: el.querySelector("[data-graph]"), start: "top 85%", toggleActions: "play none none reverse" },
      });

      gsap.from(el.querySelector("[data-meta]"), {
        y: 20, autoAlpha: 0, duration: 0.5, ease: "power2.out",
        scrollTrigger: { trigger: el.querySelector("[data-meta]"), start: "top 80%", toggleActions: "play none none reverse" },
      });
    });
    return () => mm.revert();
  }, { scope: detailRef });

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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="loading-skeleton h-8 w-64 rounded-lg" />
          <div className="loading-skeleton h-40 w-full rounded-lg" />
          <div className="loading-skeleton h-32 w-full rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!testRun) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <p className="text-[#787774]">Test run not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const statusColor = ({
    pending: "text-[#956400]",
    running: "text-[#1F6C9F]",
    completed: "text-[#346538]",
    failed: "text-[#9F2F2D]",
    cancelled: "text-[#787774]",
  } as Record<string, string>)[testRun.status] || "text-[#787774]";

  const scoreColor = reliabilityColor(testRun.reliabilityScore || 0);

  return (
    <DashboardLayout>
      <div ref={detailRef} className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/runs")}
              className="gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="font-serif text-4xl font-light tracking-[-0.02em]">Run #{testRunId}</h1>
              <p className={`text-sm font-semibold ${statusColor}`}>
                {testRun.status.toUpperCase()}
              </p>
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <DownloadIcon className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Reliability Score Card */}
        <Card data-score className="p-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div>
              <p className="mb-2 text-sm text-[#787774]">System score</p>
              <div className={`text-6xl font-bold ${scoreColor}`}>
                {testRun.totalTests > 0 ? (testRun.passedTests / testRun.totalTests * 100).toFixed(1) : "0"}
              </div>
              <p className="mt-2 text-sm text-[#787774]">/100</p>
            </div>

            <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
              <div className="text-center">
                <p className="text-3xl font-bold">{testRun.totalTests}</p>
                <p className="text-xs text-[#787774]">Total Tests</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#346538]">{testRun.passedTests}</p>
                <p className="text-xs text-[#787774]">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#9F2F2D]">{testRun.failedTests}</p>
                <p className="text-xs text-[#787774]">Failed</p>
              </div>
            </div>
          </div>

          {testRun.status === "running" && (
            <div className="mt-6 border-t border-[#EAEAEA] pt-6">
              <div className="flex items-center gap-2">
                <ReloadIcon className="h-4 w-4 animate-spin" />
                <span className="text-sm text-[#787774]">Running...</span>
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-[#EAEAEA]">
                <div
                  className="h-full rounded-full bg-[#111111] transition-all"
                  style={{
                    width: `${testRun.totalTests > 0 ? ((testRun.passedTests + testRun.failedTests) / testRun.totalTests) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </Card>

        {/* Results by Category */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-light tracking-[-0.02em]">Category breakdown</h2>
            {(() => {
              const hasSarvam = results.some((r: any) => {
                try { return JSON.parse(r.details || "{}").languages; } catch { return false; }
              });
              return hasSarvam ? (
                <span className="rounded bg-[#E1F3FE] px-2 py-1 text-[11px] text-[#1F6C9F]">
                  Multilingual attacks: en + hi, ta, bn
                </span>
              ) : null;
            })()}
          </div>
          <div data-results className="space-y-3">
            {results.map((result) => (
              <Card data-result-card key={result.id} className="card-hover p-6">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold">{result.category}</h3>
                    <p className="text-sm text-[#787774]">
                      {result.passed} passed &bull; {result.failed} failed
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {result.passed + result.failed > 0
                          ? Math.round((result.passed / (result.passed + result.failed)) * 100)
                          : 0}
                        %
                      </p>
                      <p className="text-xs text-[#787774]">Pass Rate</p>
                    </div>

                    <span className={`badge ${
                      result.severity === "critical"
                        ? "badge-critical"
                        : result.severity === "high"
                          ? "badge-high"
                          : result.severity === "medium"
                            ? "badge-medium"
                            : "badge-low"
                    }`}>
                      {result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Failure Cascades Graph */}
        {neoCascades && neoCascades.nodes.length > 0 && (
          <div data-graph>
            <h2 className="font-serif mb-4 text-2xl font-light tracking-[-0.02em]">Cascade analysis</h2>
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-[#787774]">
                  {neoCascades.edges.length} cascade relationship{neoCascades.edges.length !== 1 ? "s" : ""} detected
                </p>
                <button
                  onClick={() => setColorBy(c => c === "category" ? "community" : "category")}
                  className="flex items-center gap-1 rounded border border-[#EAEAEA] px-2 py-1 text-xs text-[#787774] hover:text-[#111111]"
                >
                  <ColorWheelIcon className="h-3 w-3" />
                  Color by {colorBy === "category" ? "community" : "category"}
                </button>
              </div>
              <CascadeGraph nodes={neoCascades.nodes} edges={neoCascades.edges} colorBy={colorBy} />
            </Card>
          </div>
        )}

        {/* Metadata */}
        <Card data-meta className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-[#787774]">Started</p>
              <p className="font-mono text-sm">
                {testRun.startedAt
                  ? new Date(testRun.startedAt).toLocaleString()
                  : "Not started"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#787774]">Completed</p>
              <p className="font-mono text-sm">
                {testRun.completedAt
                  ? new Date(testRun.completedAt).toLocaleString()
                  : "In progress"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#787774]">Duration</p>
              <p className="font-mono text-sm">
                {testRun.startedAt && testRun.completedAt
                  ? `${Math.round((new Date(testRun.completedAt).getTime() - new Date(testRun.startedAt).getTime()) / 1000)}s`
                  : "&mdash;"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
