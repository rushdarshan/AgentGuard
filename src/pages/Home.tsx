import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  LightningBoltIcon,
  BarChartIcon,
  LockClosedIcon,
  GearIcon,
  ArrowUpIcon,
  ArrowRightIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
  GlobeIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const launchDemo = trpc.demo.launch.useMutation();
  const [demoLoading, setDemoLoading] = useState(false);
  const [, setLocation] = useLocation();

  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const capabilitiesRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useGSAP((_context, contextSafe) => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const hero = heroRef.current!;
      const features = featuresRef.current!;
      const caps = capabilitiesRef.current!;
      const cta = ctaRef.current!;

      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTl.from(hero.querySelectorAll("[data-animate]"), {
        y: 40, autoAlpha: 0, duration: 0.6, stagger: 0.15,
      }).from(hero.querySelector("[data-stats]"), {
        y: 60, autoAlpha: 0, scale: 0.95, duration: 0.8,
      }, "+=0.1");

      gsap.to(hero.querySelector("[data-stats]"), {
        y: -6, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1,
      });

      ScrollTrigger.batch(features.querySelectorAll("[data-card]"), {
        onEnter: (batch) => gsap.fromTo(batch,
          { y: 50, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.08, ease: "power2.out", overwrite: true },
        ),
        onLeaveBack: (batch) => gsap.set(batch, { autoAlpha: 0, y: 50, overwrite: true }),
        start: "top 85%",
      });

      const capsTl = gsap.timeline({
        scrollTrigger: { trigger: caps, start: "top 75%", toggleActions: "play none none reverse" },
      });
      capsTl.from(caps.querySelectorAll("[data-animate]"), {
        x: -30, autoAlpha: 0, duration: 0.5, stagger: 0.1,
      }).from(caps.querySelector("[data-scorecard]"), {
        x: 40, autoAlpha: 0, duration: 0.7,
      }, "-=0.2");

      gsap.from(cta.querySelector("[data-cta]"), {
        y: 30, autoAlpha: 0, scale: 0.97, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: cta, start: "top 80%", toggleActions: "play none none reverse" },
      });
    });

    return () => mm.revert();
  }, { scope: heroRef, dependencies: [] });

  const handleLaunchDemo = async () => {
    setDemoLoading(true);
    try {
      const result = await launchDemo.mutateAsync();
      setLocation(`/runs/${result.testRunId}`);
    } catch (e) {
      toast.error(`Failed to launch demo: ${(e as Error).message}`);
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#111111]">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,0,0,0.02) 0%, transparent 60%)" }} />

      {/* Navigation */}
      <nav className="relative border-b border-[#EAEAEA]">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <LightningBoltIcon className="h-8 w-8" />
            <span className="text-2xl font-bold tracking-tight">AgentGuard</span>
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
      <section ref={heroRef} className="relative py-24 md:py-40">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <p data-animate className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-[#787774]">
              AI Agent Reliability Testing
            </p>

            <h1 data-animate className="font-serif text-6xl font-light leading-[1.1] tracking-[-0.03em] md:text-8xl">
              CI for Your AI Agents
            </h1>

            <p data-animate className="mx-auto mt-6 max-w-2xl text-lg text-[#787774]">
              Catch agent failures before your users do. Run adversarial test suites, detect prompt injection attacks, and measure reliability with precision.
            </p>

            <div data-animate className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="gap-2" onClick={handleLaunchDemo} disabled={demoLoading}>
                {demoLoading ? (
                  <>Launching... <ReloadIcon className="h-5 w-5 animate-spin" /></>
                ) : (
                  <>Launch Demo <LightningBoltIcon className="h-5 w-5" /></>
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

            <div data-stats className="mt-16 rounded-lg border border-[#EAEAEA] bg-white p-8">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold">100+</div>
                  <div className="mt-1 text-sm text-[#787774]">Attack Vectors</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">9</div>
                  <div className="mt-1 text-sm text-[#787774]">Attack Categories</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">0-100</div>
                  <div className="mt-1 text-sm text-[#787774]">Reliability Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="border-t border-[#EAEAEA] py-24 md:py-40">
        <div className="container">
          <div className="mb-16 text-center">
            <h2 className="font-serif text-4xl font-light tracking-[-0.02em] md:text-5xl">Comprehensive Testing</h2>
            <p className="mt-4 text-lg text-[#787774]">
              Nine attack categories to probe every dimension of your agent
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: LockClosedIcon,
                title: "Prompt Injection",
                description: "Detect instruction override and context hijacking attacks",
              },
              {
                icon: GearIcon,
                title: "Context Overflow",
                description: "Test behavior under extreme input and memory pressure",
              },
              {
                icon: ArrowUpIcon,
                title: "Logic Collapse",
                description: "Identify reasoning failures and contradictions",
              },
              {
                icon: LockClosedIcon,
                title: "Jailbreak",
                description: "Verify safety guardrails and constraint adherence",
              },
              {
                icon: BarChartIcon,
                title: "Hallucination",
                description: "Catch fabricated responses and false information",
              },
              {
                icon: ExclamationTriangleIcon,
                title: "Schema Drift",
                description: "Test tool calling under unexpected input shapes",
              },
              {
                icon: GlobeIcon,
                title: "Multi-tenant Leak",
                description: "Attempt cross-user data extraction from agent memory",
              },
              {
                icon: LightningBoltIcon,
                title: "Indirect Injection",
                description: "Detect attacks through tool outputs and retrieved documents",
              },
              {
                icon: LightningBoltIcon,
                title: "Multi-turn Crescendo",
                description: "Escalating jailbreak across multiple conversation rounds",
              },
            ].map((feature, i) => (
              <Card key={i} data-card className="flex flex-col gap-3 p-6">
                <feature.icon className="h-6 w-6" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-[#787774]">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section ref={capabilitiesRef} className="border-t border-[#EAEAEA] py-24 md:py-40">
        <div className="container">
          <div className="grid gap-16 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-4xl font-light tracking-[-0.02em] md:text-5xl">Built for Developers</h2>
              <ul className="mt-8 space-y-4">
                {[
                  "Real-time test execution with live progress streaming",
                  "LLM-powered dynamic attack generation tailored to your agent",
                  "Reliability scorecard with severity badges on a 0-100 scale",
                  "Failure-cascade graph visualization to trace dependency chains",
                  "Test history with filtering, sorting, and run comparison",
                  "Secure endpoint management with encrypted auth headers",
                ].map((item, i) => (
                  <div key={i} data-animate className="flex gap-3">
                    <CheckCircledIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span className="text-[#787774]">{item}</span>
                  </div>
                ))}
              </ul>
            </div>

            <div data-scorecard className="rounded-lg border border-[#EAEAEA] bg-white p-8">
              <div className="space-y-6">
                <div>
                  <div className="mb-2 text-sm font-semibold">Reliability Score</div>
                  <div className="h-2 w-full rounded-full bg-[#EAEAEA]">
                    <div className="h-full w-3/4 rounded-full bg-[#111111]"></div>
                  </div>
                  <div className="mt-2 text-2xl font-bold">75/100</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Prompt Injection</span>
                    <span className="badge badge-high">High Risk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Context Overflow</span>
                    <span className="badge badge-low">Low Risk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Logic Collapse</span>
                    <span className="badge badge-medium">Medium Risk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Jailbreak</span>
                    <span className="badge badge-critical">Critical</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Hallucination</span>
                    <span className="badge badge-low">Low Risk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Indirect Injection</span>
                    <span className="badge badge-high">High Risk</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Crescendo</span>
                    <span className="badge badge-critical">Critical</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="border-t border-[#EAEAEA] py-24 md:py-40">
        <div className="container">
          <div data-cta className="rounded-lg border border-[#EAEAEA] bg-white p-12 text-center">
            <h2 className="font-serif text-4xl font-light tracking-[-0.02em]">Ready to Test Your Agents?</h2>
            <p className="mt-4 text-lg text-[#787774]">
              Start with a free test run today.
            </p>
            <div className="mt-8">
              <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>
                <Button size="lg" className="gap-2">
                  {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
                  <ArrowRightIcon className="h-5 w-5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#EAEAEA] py-8">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <LightningBoltIcon className="h-6 w-6" />
              <span className="font-semibold">AgentGuard</span>
            </div>
            <p className="text-sm text-[#787774]">
              &copy; 2026 AgentGuard. Built for the HACKHAZARDS &apos;26 hackathon.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
