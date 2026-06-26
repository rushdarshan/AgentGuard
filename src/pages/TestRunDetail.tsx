import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import CascadeGraph from "@/components/CascadeGraph";
import { useState } from "react";
import { Loader2, Download, ArrowLeft, Palette } from "lucide-react";

export default function TestRunDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [colorBy, setColorBy] = useState<"category" | "community">("category");
  const testRunId = parseInt(params?.id || "0");

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
          <p className="text-muted-foreground">Test run not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const statusColor = ({
    pending: "text-yellow-400",
    running: "text-blue-400",
    completed: "text-green-400",
    failed: "text-red-400",
    cancelled: "text-gray-400",
  } as Record<string, string>)[testRun.status] || "text-muted-foreground";

  const scoreColor =
    (testRun.reliabilityScore || 0) >= 80
      ? "text-green-400"
      : (testRun.reliabilityScore || 0) >= 60
        ? "text-yellow-400"
        : (testRun.reliabilityScore || 0) >= 40
          ? "text-orange-400"
          : "text-red-400";

  const glowColor = scoreColor
    .replace("green-400", "glow-text-green")
    .replace("yellow-400", "glow-text-yellow")
    .replace("orange-400", "glow-text-orange")
    .replace("red-400", "glow-text-red");

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/runs")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-4xl font-bold">Run #{testRunId}</h1>
              <p className={`text-sm font-semibold ${statusColor}`}>
                {testRun.status.toUpperCase()}
              </p>
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Reliability Score Card */}
        <Card className="card-gradient-border border-accent/30 bg-gradient-to-br from-accent/[0.08] to-accent/[0.02] p-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">System score</p>
              <div className={`text-6xl font-bold ${scoreColor} ${glowColor}`}>
                {testRun.totalTests > 0 ? (testRun.passedTests / testRun.totalTests * 100).toFixed(1) : "0"}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">/100</p>
            </div>

            <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
              <div className="text-center">
                <p className="text-3xl font-bold">{testRun.totalTests}</p>
                <p className="text-xs text-muted-foreground">Total Tests</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{testRun.passedTests}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">{testRun.failedTests}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </div>

          {testRun.status === "running" && (
            <div className="mt-6 border-t border-border/50 pt-6">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span className="text-sm text-muted-foreground">Running...</span>
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent transition-all"
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
            <h2 className="page-title text-2xl font-bold">Category breakdown</h2>
            {(() => {
              const hasSarvam = results.some((r: any) => {
                try { return JSON.parse(r.details || "{}").languages; } catch { return false; }
              });
              return hasSarvam ? (
                <span className="rounded bg-accent/10 px-2 py-1 text-[11px] text-accent">
                  Multilingual attacks: en + hi, ta, bn
                </span>
              ) : null;
            })()}
          </div>
          <div className="space-y-3">
            {results.map((result) => (
              <Card key={result.id} className="card-hover p-6 transition-all duration-200 hover:-translate-y-0.5">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold">{result.category}</h3>
                    <p className="text-sm text-muted-foreground">
                      {result.passed} passed • {result.failed} failed
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
                      <p className="text-xs text-muted-foreground">Pass Rate</p>
                    </div>

                    <div
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        result.severity === "critical"
                          ? "badge-critical"
                          : result.severity === "high"
                            ? "badge-high"
                            : result.severity === "medium"
                              ? "badge-medium"
                              : "badge-low"
                      }`}
                    >
                      {result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Failure Cascades Graph */}
        {neoCascades && neoCascades.nodes.length > 0 && (
          <div>
            <h2 className="page-title mb-4 text-2xl font-bold">Cascade analysis</h2>
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {neoCascades.edges.length} cascade relationship{neoCascades.edges.length !== 1 ? "s" : ""} detected
                </p>
                <button
                  onClick={() => setColorBy(c => c === "category" ? "community" : "category")}
                  className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Palette className="h-3 w-3" />
                  Color by {colorBy === "category" ? "community" : "category"}
                </button>
              </div>
              <CascadeGraph nodes={neoCascades.nodes} edges={neoCascades.edges} colorBy={colorBy} />
            </Card>
          </div>
        )}

        {/* Metadata */}
        <Card className="bg-card/30 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Started</p>
              <p className="font-mono text-sm">
                {testRun.startedAt
                  ? new Date(testRun.startedAt).toLocaleString()
                  : "Not started"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="font-mono text-sm">
                {testRun.completedAt
                  ? new Date(testRun.completedAt).toLocaleString()
                  : "In progress"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-mono text-sm">
                {testRun.startedAt && testRun.completedAt
                  ? `${Math.round((new Date(testRun.completedAt).getTime() - new Date(testRun.startedAt).getTime()) / 1000)}s`
                  : "—"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
