import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { PlusIcon, Share1Icon } from "@radix-ui/react-icons";
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
    // 1. Stats Grid Stagger
    const statCards = statsRef.current?.children;
    if (statCards) {
      gsap.from(statCards, {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
      });
      
      // Animate the numbers inside the stats
      const numbers = statsRef.current?.querySelectorAll("[data-target]");
      numbers?.forEach((el) => {
        const target = parseInt(el.getAttribute("data-target") || "0");
        const suffix = el.getAttribute("data-suffix") || "";
        gsap.fromTo(el,
          { innerHTML: 0 },
          {
            innerHTML: target,
            duration: 1.5,
            ease: "power2.out",
            snap: { innerHTML: 1 },
            onUpdate: function() {
              el.textContent = Math.round(Number(this.targets()[0].innerHTML)) + suffix;
            }
          }
        );
      });
    }

    // 2. Recent Runs Stagger
    const runCards = runsRef.current?.children;
    if (runCards) {
      gsap.from(runCards, {
        x: -20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
        delay: 0.3
      });
    }
  }, { scope: containerRef });

  return (
    <DashboardLayout>
      <div ref={containerRef}>
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center py-6">
          <div>
            <p className="font-mono text-sm tracking-[0.15em] text-[#8A8A8A]">/// OPERATIONS \\\</p>
            <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">DASHBOARD</h1>
            <p className="mt-1 font-mono text-sm tracking-[0.08em] text-[#8A8A8A]">
              WELCOME BACK, {user?.name}
            </p>
          </div>
          <Link href="/agents/new">
            <Button className="gap-2">
              <PlusIcon className="h-4 w-4" /> [ ADD AGENT ]
            </Button>
          </Link>
        </div>

        {agentsLoading || runsLoading ? (
          <div className="space-y-6 border-t border-[#2A2A2A] pt-6">
            <div className="grid gap-[1px] bg-[#2A2A2A] md:grid-cols-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-[#121212] p-6 animate-pulse">
                  <div className="h-3 w-16 bg-[#2A2A2A] mb-3"></div>
                  <div className="h-8 w-20 bg-[#2A2A2A]"></div>
                </div>
              ))}
            </div>
            <div className="space-y-[1px] bg-[#2A2A2A]">
              {[1,2,3].map(i => (
                <div key={i} className="bg-[#121212] p-4 animate-pulse">
                  <div className="h-4 w-24 bg-[#2A2A2A] mb-2"></div>
                  <div className="h-3 w-48 bg-[#2A2A2A]"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (<>
        <hr data-divider="heavy" className="my-0" />
        <div ref={statsRef} className="grid gap-[1px] bg-[#2A2A2A] md:grid-cols-4 border-b border-[#2A2A2A]">
          {[
            { label: "AGENTS", value: totalAgents, suffix: "", color: "#EAEAEA" },
            { label: "RELIABILITY", value: avgReliability, suffix: "%", color: "#EAEAEA" },
            { label: "RUNS", value: testRuns.length, suffix: "", color: "#EAEAEA" },
            { label: "CRITICAL", value: criticalIssues, suffix: "", color: "#E61919" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#121212] p-6 will-change-transform">
              <p className="font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]">{stat.label}</p>
              <p className="mt-1 font-display text-4xl font-black" style={{ color: stat.color }}>
                <span data-target={stat.value} data-suffix={stat.suffix}>{stat.value}{stat.suffix}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="py-10">
          <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2A] pb-2">
            <p className="font-mono text-sm tracking-[0.15em] text-[#8A8A8A]" data-framed>RECENT RUNS</p>
            <Link href="/runs">
              <Button variant="outline" size="sm">[ VIEW ALL ]</Button>
            </Link>
          </div>

          {recentRuns.length > 0 ? (
            <div ref={runsRef} className="space-y-[1px] bg-[#2A2A2A]">
              {recentRuns.map((run) => (
                <Link key={run.id} href={`/runs/${run.id}`}>
                  <div className="card-hover bg-[#121212] p-4 border-0 will-change-transform">
                    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                      <div className="flex-1">
                        <p className="font-mono text-base font-semibold tracking-[0.05em]">RUN #{run.id}</p>
                        <p className="font-mono text-[11px] text-[#8A8A8A]">
                          {run.totalTests} TESTS &mdash; {run.passedTests} PASSED &mdash; {run.failedTests} FAILED
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-display text-2xl font-black">{run.totalTests > 0 ? (run.passedTests / run.totalTests * 100).toFixed(1) : "0"}%</p>
                          <p className="font-mono text-[10px] text-[#8A8A8A]">
                            {run.status === "running" ? "RUNNING..." : "COMPLETED"}
                          </p>
                        </div>
                        <span className={`badge ${reliabilityBadge(run.reliabilityScore || 0)} text-xs font-bold`}>
                          {reliabilityLabel(run.reliabilityScore || 0)}
                        </span>
                          {(() => {
                            const total = (run as any).totalTests || 0;
                            const passed = (run as any).passedTests || 0;
                            const tier = total > 0 ? classifyConfidence(passed, total) : null;
                            if (!tier) return null;
                            const { label, color } = getConfidenceBadge(tier);
                            return (
                              <>
                                <span className="font-mono text-[9px] text-[#8A8A8A] mr-1">CALIPER</span>
                                <span className="font-mono text-[9px] px-1.5 py-0.5 border" style={{ borderColor: color + "40", backgroundColor: color + "10", color }}>
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
            <Card className="p-8 text-center border-[#2A2A2A] bg-[#121212] rounded-none">
              <p className="font-mono text-base text-[#8A8A8A]">NO RUNS YET. CREATE AN AGENT AND START TESTING.</p>
              <Link href="/agents/new">
                <Button className="mt-4">[ CREATE AGENT ]</Button>
              </Link>
            </Card>
          )}
        </div>

        <div className="grid gap-[1px] bg-[#2A2A2A] md:grid-cols-2 border-t border-[#2A2A2A]">
          <div className="bg-[#121212] p-8">
            <p className="mb-8 font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]" data-framed>QUICK START</p>
            <ol className="space-y-4 font-mono text-sm">
              {[
                "REGISTER YOUR AGENT ENDPOINT",
                "CONFIGURE ATTACK CATEGORIES",
                "RUN ADVERSARIAL TEST SUITE",
                "REVIEW RELIABILITY SCORECARD",
                "ANALYZE FAILURE CASCADES",
              ].map((step, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[#2A2A2A] text-[10px] font-bold text-[#8A8A8A]">
                    {i + 1}
                  </span>
                  <span className="tracking-[0.05em] text-[#EAEAEA]">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-[#121212] p-8">
            <p className="mb-8 font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]" data-framed>ATTACK SURFACE</p>
            <div className="space-y-2">
              {["PROMPT INJECTION", "CONTEXT OVERFLOW", "LOGIC COLLAPSE", "JAILBREAK", "HALLUCINATION", "SCHEMA DRIFT", "MULTI-TENANT LEAK", "INDIRECT INJECTION", "MULTI-TURN CRESCENDO"].map(cat => (
                <div key={cat} className="flex items-center gap-2 font-mono text-sm text-[#EAEAEA]">
                  <span className="text-[#E61919] font-mono text-[10px]">&gt;</span>
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


