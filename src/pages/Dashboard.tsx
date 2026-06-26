import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { PlusIcon, ArrowUpIcon, ExclamationTriangleIcon, CheckCircledIcon, ClockIcon, Share1Icon } from "@radix-ui/react-icons";
import DashboardLayout from "@/components/DashboardLayout";
import { reliabilityBadge, reliabilityLabel } from "@/const";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const { data: testRuns = [] } = trpc.testRuns.list.useQuery({});
  const dashRef = useRef<HTMLDivElement>(null);

  useGSAP((_context, contextSafe) => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const el = dashRef.current!;

      gsap.from(el.querySelectorAll("[data-stat]"), {
        y: 30, autoAlpha: 0, duration: 0.5, stagger: 0.1, ease: "power3.out",
      });

      gsap.from(el.querySelectorAll("[data-run-row]"), {
        x: -20, autoAlpha: 0, duration: 0.4, stagger: 0.07, ease: "power2.out",
        scrollTrigger: { trigger: el.querySelector("[data-runs]"), start: "top 80%", toggleActions: "play none none reverse" },
      });

      gsap.from(el.querySelectorAll("[data-step]"), {
        x: -15, autoAlpha: 0, duration: 0.4, stagger: 0.08, ease: "power2.out",
        scrollTrigger: { trigger: el.querySelector("[data-steps]"), start: "top 80%", toggleActions: "play none none reverse" },
      });
    });
    return () => mm.revert();
  }, { scope: dashRef });

  const totalAgents = agents.length;
  const recentRuns = testRuns.slice(0, 5);
  const avgReliability =
    testRuns.length > 0
      ? Math.round(
          testRuns.reduce((sum, run) => sum + (run.reliabilityScore || 0), 0) / testRuns.length
        )
      : 0;

  const criticalIssues = testRuns.filter((run) => (run.reliabilityScore || 0) < 50).length;

  return (
    <DashboardLayout>
      <div ref={dashRef} className="space-y-10">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-serif text-4xl font-light tracking-[-0.02em]">Dashboard</h1>
            <p className="mt-1 text-[#787774]">Welcome back, {user?.name}</p>
          </div>
          <Link href="/agents/new">
            <Button className="gap-2">
              <PlusIcon className="h-5 w-5" />
              Add Agent
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div data-stat>
            <div className="flex items-center gap-2 text-[#787774]">
              <ArrowUpIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">Agents</span>
            </div>
            <p className="mt-1 text-3xl font-bold">{totalAgents}</p>
          </div>
          <div data-stat>
            <div className="flex items-center gap-2 text-[#787774]">
              <CheckCircledIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">Reliability</span>
            </div>
            <p className="mt-1 text-3xl font-bold">{avgReliability.toFixed(1)}%</p>
          </div>
          <div data-stat>
            <div className="flex items-center gap-2 text-[#787774]">
              <ClockIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">Runs</span>
            </div>
            <p className="mt-1 text-3xl font-bold">{testRuns.length}</p>
          </div>
          <div data-stat>
            <div className="flex items-center gap-2 text-[#787774]">
              <ExclamationTriangleIcon className="h-3.5 w-3.5 text-[#9F2F2D]" />
              <span className="text-xs font-medium uppercase tracking-wider text-[#9F2F2D]">Critical</span>
            </div>
            <p className="mt-1 text-3xl font-bold text-[#9F2F2D]">{criticalIssues}</p>
          </div>
        </div>

        {/* Recent Test Runs */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-light tracking-[-0.02em]">Recent runs</h2>
            <Link href="/runs">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          {recentRuns.length > 0 ? (
            <div data-runs className="space-y-3">
              {recentRuns.map((run) => (
                <Link key={run.id} href={`/runs/${run.id}`}>
                  <Card data-run-row className="card-hover p-4">
                    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                      <div className="flex-1">
                        <p className="font-semibold">Run #{run.id}</p>
                        <p className="text-sm text-[#787774]">
                          {run.totalTests} tests — {run.passedTests} passed — {run.failedTests} failed
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold">{run.totalTests > 0 ? (run.passedTests / run.totalTests * 100).toFixed(1) : "0"}%</p>
                          <p className="text-xs text-[#787774]">
                            {run.status === "running" ? "Running..." : "Completed"}
                          </p>
                        </div>

                        <span className={`badge ${reliabilityBadge(run.reliabilityScore || 0)}`}>
                          {reliabilityLabel(run.reliabilityScore || 0)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-[#787774]">No runs yet. Create an agent and start testing.</p>
              <Link href="/agents/new">
                <Button className="mt-4">Create Agent</Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Cascade Patterns (Neo4j) */}
        <CascadePatternsCard />

        {/* Quick start */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="card-hover p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.1em] text-[#787774]">Quick start</h3>
            <ol data-steps className="space-y-3 text-sm">
              <li data-step className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#EAEAEA] text-xs font-semibold">1</span>
                <span>Register your agent endpoint</span>
              </li>
              <li data-step className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#EAEAEA] text-xs font-semibold">2</span>
                <span>Configure attack categories</span>
              </li>
              <li data-step className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#EAEAEA] text-xs font-semibold">3</span>
                <span>Run adversarial test suite</span>
              </li>
              <li data-step className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#EAEAEA] text-xs font-semibold">4</span>
                <span>Review reliability scorecard</span>
              </li>
              <li data-step className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#EAEAEA] text-xs font-semibold">5</span>
                <span>Analyze failure cascades</span>
              </li>
            </ol>
          </Card>

          <Card className="card-hover p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.1em] text-[#787774]">Attack surface</h3>
            <div className="space-y-2 text-sm">
              {["Prompt Injection", "Context Overflow", "Logic Collapse", "Jailbreak", "Hallucination", "Schema Drift", "Multi-tenant Context Leak", "Indirect Prompt Injection", "Multi-turn Crescendo"].map(cat => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D4D4D4]" />
                  {cat}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function CascadePatternsCard() {
  const { data: patterns = [] } = trpc.testRuns.getCascadePatterns.useQuery(undefined, {
    enabled: true,
  });

  if (patterns.length === 0) return null;

  const maxFreq = Math.max(...patterns.map((p) => p.frequency));

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Share1Icon className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Cascade patterns</h2>
      </div>
      <p className="mb-4 text-sm text-[#787774]">
        Most frequent failure cascades across all runs
      </p>
      <div className="space-y-2">
        {patterns.slice(0, 5).map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-32 text-right text-sm font-medium">{p.sourceCategory}</span>
            <span className="text-[#787774]">&rarr;</span>
            <span className="w-40 text-sm">{p.targetCategory}</span>
            <div className="flex flex-1 items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-[#EAEAEA]">
                <div
                  className="h-full rounded-full bg-[#111111]"
                  style={{ width: `${(p.frequency / maxFreq) * 100}%` }}
                />
              </div>
              <span className="w-24 text-right text-xs text-[#787774]">
                {p.frequency}x
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
