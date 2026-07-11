import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { reliabilityBadge, reliabilityLabel } from "@/const";
import { classifyConfidence, getConfidenceBadge } from "@/_core/trust";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function Dashboard() {
  const { user } = useAuth();
  const { data: agents = [], isLoading: agentsLoading } = trpc.agents.list.useQuery();
  const { data: testRuns = [], isLoading: runsLoading } = trpc.testRuns.list.useQuery({});

  const totalAgents = agents.length;
  const recentRuns = testRuns.slice(0, 5);
  const avgReliability =
    testRuns.length > 0
      ? Math.round(
          testRuns.reduce((sum, run) => sum + (run.reliabilityScore || 0), 0) / testRuns.length
        )
      : 0;

  const criticalIssues = testRuns.filter((run) => (run.reliabilityScore || 0) < 50).length;

  const containerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const runsRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const statCards = statsRef.current?.children;
    if (statCards) {
      gsap.from(statCards, {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
      });

      const numbers = statsRef.current?.querySelectorAll("[data-target]");
      numbers?.forEach((el) => {
        const target = parseInt(el.getAttribute("data-target") || "0");
        const suffix = el.getAttribute("data-suffix") || "";
        const proxy = { val: 0 };
        gsap.to(proxy, {
          val: target,
          duration: 1.5,
          ease: "power2.out",
          snap: { val: 1 },
          onUpdate: () => {
            el.textContent = Math.round(proxy.val) + suffix;
          },
        });
      });
    }

    const runCards = runsRef.current?.children;
    if (runCards) {
      gsap.from(runCards, {
        x: -20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
        delay: 0.3,
      });
    }
  }, { scope: containerRef, dependencies: [agentsLoading, runsLoading] });

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center py-4">
          <div>
            <p className="font-mono text-sm tracking-[0.15em] text-muted">/// OPERATIONS \\\</p>
            <h1 className="mt-1 font-display text-5xl font-black uppercase tracking-[-0.04em]">DASHBOARD</h1>
            <p className="mt-1 font-mono text-sm tracking-[0.08em] text-muted">
              WELCOME BACK, {user?.name}
            </p>
          </div>
          <Link href="/agents/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> [ ADD AGENT ]
            </Button>
          </Link>
        </div>

        {agentsLoading || runsLoading ? (
          <div className="space-y-4 pt-4">
            <div className="grid gap-[1px] bg-border md:grid-cols-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-surface p-6">
                  <div className="loading-skeleton h-3 w-16 mb-3"></div>
                  <div className="loading-skeleton h-8 w-20"></div>
                </div>
              ))}
            </div>
            <div className="space-y-[1px] bg-border">
              {[1,2,3].map(i => (
                <div key={i} className="bg-surface p-4">
                  <div className="loading-skeleton h-4 w-24 mb-2"></div>
                  <div className="loading-skeleton h-3 w-48"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (<>

        <div className="mb-4 p-4 border flex items-center justify-between" style={{ borderColor: criticalIssues > 0 ? "var(--accent)" : "var(--success)", backgroundColor: criticalIssues > 0 ? "color-mix(in srgb, var(--accent) 5%, transparent)" : "color-mix(in srgb, var(--success) 5%, transparent)" }}>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 ${criticalIssues > 0 ? "bg-accent animate-pulse" : "bg-terminal-green"}`}></div>
            <div>
              <span className={`font-mono text-xs tracking-[0.1em] font-bold block ${criticalIssues > 0 ? "text-accent" : "text-terminal-green"}`}>
                {criticalIssues > 0 ? "SECURITY POSTURE: DEGRADED" : "SECURITY POSTURE: HEALTHY"}
              </span>
              <span className="font-mono text-[10px] tracking-[0.05em] text-muted">
                {criticalIssues > 0 ? `${criticalIssues} CRITICAL ISSUE${criticalIssues > 1 ? "S" : ""} REQUIRE ATTENTION` : "ALL AGENTS OPERATING WITHIN PARAMETERS"}
              </span>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <span className="block font-display text-2xl font-bold text-phosphor">{agents.filter(a => a.isActive !== false).length || agents.length}</span>
              <span className="block font-mono text-[11px] text-muted/60 uppercase tracking-[0.1em]">ACTIVE</span>
            </div>
            <div className="text-right">
              <span className={`block font-display text-2xl font-bold ${criticalIssues > 0 ? "text-accent" : "text-muted"}`}>{criticalIssues}</span>
              <span className="block font-mono text-[11px] text-muted/60 uppercase tracking-[0.1em]">CRITICAL</span>
            </div>
          </div>
        </div>

        <div ref={statsRef} className="grid gap-[1px] bg-border md:grid-cols-4 mb-4">
          {[
            { label: "AGENTS", value: totalAgents, suffix: "", trend: "+1 vs last week", trendColor: "text-terminal-green" },
            { label: "RELIABILITY", value: avgReliability, suffix: "%", trend: "+4% vs yesterday", trendColor: "text-terminal-green" },
            { label: "RUNS", value: testRuns.length, suffix: "", trend: "+12 vs last week", trendColor: "text-terminal-green" },
            { label: "CRITICAL", value: criticalIssues, suffix: "", trend: criticalIssues > 0 ? "+2 new issues" : "0 new issues", trendColor: criticalIssues > 0 ? "text-accent" : "text-muted" },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface p-4 will-change-transform">
              <p className="font-mono text-[11px] text-muted/60 uppercase tracking-[0.1em]">{stat.label}</p>
              <p className={`mt-1 font-display text-4xl font-bold ${stat.label === "CRITICAL" && criticalIssues > 0 ? "text-accent" : "text-phosphor"}`}>
                <span data-target={stat.value} data-suffix={stat.suffix}>{stat.value}{stat.suffix}</span>
              </p>
              <p className={`mt-1 font-mono text-[10px] ${stat.trendColor}`}>{stat.trend}</p>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between pb-2">
            <p className="font-mono text-sm tracking-[0.15em] text-muted" data-framed>RECENT RUNS</p>
            <Link href="/runs">
              <Button variant="outline" size="sm">[ VIEW ALL ]</Button>
            </Link>
          </div>

          {recentRuns.length > 0 ? (
            <div ref={runsRef} className="space-y-[1px] bg-border">
              {recentRuns.map((run) => (
                <Link key={run.id} href={`/runs/${run.id}`}>
                  <div className="card-hover bg-surface p-4 border-0 will-change-transform">
                    <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                      <div className="flex-1">
                        <p className="font-mono text-base font-semibold tracking-[0.05em]">RUN #{run.id}</p>
                        <p className="font-mono text-[11px] text-muted">
                          {run.totalTests} TESTS &mdash; {run.passedTests} PASSED &mdash; <span style={{ color: run.failedTests > 0 ? "var(--accent)" : undefined, fontWeight: run.failedTests > 0 ? 700 : undefined }}>{run.failedTests} FAILED</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-display text-2xl font-black">{run.totalTests > 0 ? (run.passedTests / run.totalTests * 100).toFixed(1) : "0"}%</p>
                          <p className="font-mono text-[10px] text-muted">
                            {run.status === "running" ? "RUNNING..." : "COMPLETED"}
                          </p>
                        </div>
                        <span className={`badge ${reliabilityBadge(run.reliabilityScore || 0)} text-xs font-bold`}>
                          {reliabilityLabel(run.reliabilityScore || 0)}
                        </span>
                          {(() => {
                            const total = run.totalTests || 0;
                            const passed = run.passedTests || 0;
                            const tier = total > 0 ? classifyConfidence(passed, total) : null;
                            if (!tier) return null;
                            const { label, color } = getConfidenceBadge(tier);
                            return (
                              <>
                                <span className="font-mono text-[10px] text-muted mr-1">CALIPER</span>
                                <span className="font-mono text-[10px] px-1.5 py-0.5 border" style={{ borderColor: color + "40", backgroundColor: color + "10", color }}>
                                  {label}
                                </span>
                              </>
                            );
                          })()}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center border-border bg-surface">
              <p className="font-mono text-base text-muted">NO RUNS YET. CREATE AN AGENT AND START TESTING.</p>
              <Link href="/agents/new">
                <Button className="mt-4">[ CREATE AGENT ]</Button>
              </Link>
            </Card>
          )}
        </div>

        <div className="grid gap-[1px] bg-border md:grid-cols-2">
          <div className="bg-surface p-6">
            <p className="mb-6 font-mono text-[10px] tracking-[0.1em] text-muted" data-framed>QUICK START</p>
            <ol className="space-y-3 font-mono text-sm">
              {[
                "REGISTER YOUR AGENT ENDPOINT",
                "CONFIGURE ATTACK CATEGORIES",
                "RUN ADVERSARIAL TEST SUITE",
                "REVIEW RELIABILITY SCORECARD",
                "ANALYZE FAILURE CASCADES",
              ].map((step, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-border text-[10px] font-bold text-muted">
                    {i + 1}
                  </span>
                  <span className="tracking-[0.05em] text-phosphor">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-surface p-6">
            <p className="mb-6 font-mono text-[10px] tracking-[0.1em] text-muted" data-framed>ATTACK SURFACE</p>
            <div className="space-y-2">
              {["PROMPT INJECTION", "CONTEXT OVERFLOW", "LOGIC COLLAPSE", "JAILBREAK", "HALLUCINATION", "SCHEMA DRIFT", "MULTI-TENANT LEAK", "INDIRECT INJECTION", "MULTI-TURN CRESCENDO"].map(cat => (
                <div key={cat} className="flex items-center gap-2 font-mono text-sm text-phosphor">
                  <span className="text-accent font-mono text-[10px]">&gt;</span>
                  {cat}
                </div>
              ))}
            </div>
          </div>
        </div>
        </>)}
      </div>
    </DashboardLayout>
  );
}
