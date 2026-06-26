import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Shield,
  Zap,
  BarChart3,
  Lock,
  Cpu,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Globe,
  Loader2,
} from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const launchDemo = trpc.demo.launch.useMutation();
  const [demoLoading, setDemoLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleLaunchDemo = async () => {
    setDemoLoading(true);
    try {
      const result = await launchDemo.mutateAsync();
      setLocation(`/runs/${result.testRunId}`);
    } catch {
      toast.error("Failed to launch demo");
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="scanline" aria-hidden="true" />
      {/* Navigation */}
      <nav className="border-b border-border/50 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-accent" />
            <span className="text-2xl font-bold">AgentGuard</span>
          </div>
          <div>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button variant="default">Dashboard</Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button variant="default">Get Started</Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-2 backdrop-blur-sm">
              <Zap className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">AI Agent Reliability Testing</span>
            </div>

            <h1 className="mb-6 text-5xl font-bold md:text-7xl">
              CI for Your{" "}
              <span className="text-accent">
                AI Agents
              </span>
            </h1>

            <p className="mb-8 text-xl text-muted-foreground md:text-2xl">
              Catch agent failures before your users do. Run adversarial test suites, detect prompt injection attacks, and measure reliability with precision.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2" onClick={handleLaunchDemo} disabled={demoLoading}>
                {demoLoading ? (
                  <>Launching... <Loader2 className="h-5 w-5 animate-spin" /></>
                ) : (
                  <>Launch Demo <Zap className="h-5 w-5" /></>
                )}
              </Button>
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" variant="outline">Dashboard</Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" variant="outline">Get Started</Button>
                </a>
              )}
            </div>

            {/* Hero Visual */}
            <div className="mt-16 rounded-lg border border-border/50 bg-card/30 p-8 backdrop-blur-sm">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-accent">100+</div>
                  <div className="text-sm text-muted-foreground">Attack Vectors</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent">9</div>
                  <div className="text-sm text-muted-foreground">Attack Categories</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent">0-100</div>
                  <div className="text-sm text-muted-foreground">Reliability Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border/50 py-20 md:py-32">
        <div className="container">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">Comprehensive Testing</h2>
            <p className="text-xl text-muted-foreground">
              Nine attack categories to stress-test every dimension of your agent
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {[
              {
                icon: Lock,
                title: "Prompt Injection",
                description: "Detect instruction override and context hijacking attacks",
              },
              {
                icon: Cpu,
                title: "Context Overflow",
                description: "Test behavior under extreme input and memory pressure",
              },
              {
                icon: TrendingUp,
                title: "Logic Collapse",
                description: "Identify reasoning failures and contradictions",
              },
              {
                icon: Shield,
                title: "Jailbreak",
                description: "Verify safety guardrails and constraint adherence",
              },
              {
                icon: BarChart3,
                title: "Hallucination",
                description: "Catch fabricated responses and false information",
              },
              {
                icon: AlertCircle,
                title: "Schema Drift",
                description: "Test tool calling under unexpected input shapes",
              },
              {
                icon: Globe,
                title: "Multi-tenant Leak",
                description: "Attempt cross-user data extraction from agent memory",
              },
              {
                icon: Shield,
                title: "Indirect Injection",
                description: "Detect attacks through tool outputs and retrieved documents",
              },
              {
                icon: Zap,
                title: "Multi-turn Crescendo",
                description: "Escalating multi-turn jailbreak across N conversation rounds",
              },
            ].map((feature, i) => (
              <Card key={i} className="flex flex-col gap-4 p-6">
                <feature.icon className="h-8 w-8 text-accent" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="border-t border-border/50 py-20 md:py-32">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="mb-6 text-4xl font-bold">Built for Developers</h2>
              <ul className="space-y-4">
                {[
                  "Real-time test execution with live progress streaming",
                  "LLM-powered dynamic attack generation tailored to your agent",
                  "Reliability scorecard with severity badges (0–100 scale)",
                  "Failure-cascade graph visualization to understand dependencies",
                  "Test history with filtering, sorting, and run comparison",
                  "Secure endpoint management with encrypted auth headers",
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border/50 bg-card/30 p-8 backdrop-blur-sm">
              <div className="space-y-6">
                <div>
                  <div className="mb-2 text-sm font-semibold text-accent">Reliability Score</div>
                  <div className="h-2 w-full rounded-full bg-border">
                    <div className="h-full w-3/4 rounded-full bg-accent"></div>
                  </div>
                  <div className="mt-2 text-2xl font-bold">75/100</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Prompt Injection</span>
                    <span className="badge-high">High Risk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Context Overflow</span>
                    <span className="badge-low">Low Risk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Logic Collapse</span>
                    <span className="badge-medium">Medium Risk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Jailbreak</span>
                    <span className="badge-critical">Critical</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Hallucination</span>
                    <span className="badge-low">Low Risk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Indirect Injection</span>
                    <span className="badge-high">High Risk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Crescendo</span>
                    <span className="badge-critical">Critical</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/50 py-20 md:py-32">
        <div className="container">
          <div className="rounded-lg border border-border/50 bg-gradient-to-br from-accent/10 to-accent/5 p-12 text-center backdrop-blur-sm">
            <h2 className="mb-4 text-4xl font-bold">Ready to Test Your Agents?</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join developers building reliable AI systems. Start with a free test run today.
            </p>
            <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>
              <Button size="lg" className="gap-2">
                {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-accent" />
              <span className="font-semibold">AgentGuard</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 AgentGuard. Built for the HACKHAZARDS '26 hackathon.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
