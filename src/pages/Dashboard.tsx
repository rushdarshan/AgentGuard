import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Plus, TrendingUp, AlertCircle, CheckCircle, Clock, GitBranch } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { reliabilityBadge, reliabilityLabel } from "@/const";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const { data: testRuns = [] } = trpc.testRuns.list.useQuery({});

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
      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="page-title text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.name}</p>
          </div>
          <Link href="/agents/new">
            <Button className="gap-2">
              <Plus className="h-5 w-5" />
              Add Agent
            </Button>
          </Link>
        </div>

        {/* Stats — no cards, just numbers */}
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium uppercase tracking-wider">Agents</span>
            </div>
            <p className="mt-1 text-3xl font-bold">{totalAgents}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium uppercase tracking-wider">Reliability</span>
            </div>
            <p className="mt-1 text-3xl font-bold">{avgReliability.toFixed(1)}%</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium uppercase tracking-wider">Runs</span>
            </div>
            <p className="mt-1 text-3xl font-bold">{testRuns.length}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs font-medium uppercase tracking-wider">Critical</span>
            </div>
            <p className="mt-1 text-3xl font-bold text-red-400">{criticalIssues}</p>
          </div>
        </div>

        {/* Recent Test Runs */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="page-title text-2xl font-bold">Recent runs</h2>
            <Link href="/runs">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          {recentRuns.length > 0 ? (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <Link key={run.id} href={`/runs/${run.id}`}>
                  <Card className="card-hover p-4 transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                      <div className="flex-1">
                        <p className="font-semibold">Run #{run.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {run.totalTests} tests — {run.passedTests} passed — {run.failedTests} failed
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold">{run.totalTests > 0 ? (run.passedTests / run.totalTests * 100).toFixed(1) : "0"}%</p>
                          <p className="text-xs text-muted-foreground">
                            {run.status === "running" ? "Running..." : "Completed"}
                          </p>
                        </div>

                        <div
                          className={`rounded-full px-3 py-1 text-sm font-medium ${reliabilityBadge(run.reliabilityScore || 0)}`}
                        >
                          {reliabilityLabel(run.reliabilityScore || 0)}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No runs yet. Create an agent and start testing.</p>
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
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick start</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">1</span>
                <span>Register your agent endpoint</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">2</span>
                <span>Configure attack categories</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">3</span>
                <span>Run adversarial test suite</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">4</span>
                <span>Review reliability scorecard</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">5</span>
                <span>Analyze failure cascades</span>
              </li>
            </ol>
          </Card>

          <Card className="card-hover p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Attack surface</h3>
            <div className="space-y-2 text-sm">
              {["Prompt Injection", "Context Overflow", "Logic Collapse", "Jailbreak", "Hallucination", "Schema Drift", "Multi-tenant Context Leak", "Indirect Prompt Injection", "Multi-turn Crescendo"].map(cat => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent/40" />
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
    <Card className="border-accent/20 bg-gradient-to-br from-accent/[0.03] to-transparent p-6">
      <div className="mb-4 flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-accent" />
        <h2 className="text-xl font-bold">Cascade patterns</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Most frequent failure cascades across all runs
      </p>
      <div className="space-y-2">
        {patterns.slice(0, 5).map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-32 text-right text-sm font-medium">{p.sourceCategory}</span>
            <span className="text-muted-foreground">→</span>
            <span className="w-40 text-sm">{p.targetCategory}</span>
            <div className="flex flex-1 items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${(p.frequency / maxFreq) * 100}%` }}
                />
              </div>
              <span className="w-24 text-right text-xs text-muted-foreground">
                {p.frequency}x
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
