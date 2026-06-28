import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { LightningBoltIcon, ReloadIcon, EyeOpenIcon, LockClosedIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DemoCascadeGraph from "@/components/DemoCascadeGraph";


gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function Home() {
  const { isAuthenticated } = useAuth();
  const launchDemo = trpc.demo.launch.useMutation();
  const [demoLoading, setDemoLoading] = useState(false);
  const [, setLocation] = useLocation();

  const containerRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLHeadingElement>(null);
  const numbersRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // 1. Hero text slide reveal
    const spans = heroTextRef.current?.children;
    if (spans) {
      Array.from(spans).forEach((span: Element, index: number) => {
        gsap.fromTo(span,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            duration: 1.0,
            delay: index * 0.25,
            ease: "power3.out",
          }
        );
      });
    }

    // 2. Number counters
    const numberElements = numbersRef.current?.querySelectorAll("[data-number]");
    if (numberElements) {
      numberElements.forEach((el) => {
        const target = parseInt(el.getAttribute("data-number") || "0");
        gsap.fromTo(el,
          { innerHTML: 0 },
          {
            innerHTML: target,
            duration: 2,
            ease: "power2.out",
            snap: { innerHTML: 1 },
            scrollTrigger: {
              trigger: numbersRef.current,
              start: "top 80%",
            }
          }
        );
      });
    }

    // 3. Feature grid stagger
    const featureCards = featuresRef.current?.children;
    if (featureCards) {
      gsap.from(featureCards, {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 75%",
        }
      });
    }
  }, { scope: containerRef });

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
    <div ref={containerRef} className="min-h-screen bg-[#0A0A0A] text-[#EAEAEA] font-sans">
      {/* Navigation */}
      <nav className="border-b-2 border-[#2A2A2A]">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-[#E61919] tracking-[0.15em]">®</span>
            <span className="font-display text-lg font-black tracking-[-0.03em]">AGENTGUARD</span>
            <span className="ml-3 font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A] border border-[#2A2A2A] px-1.5 py-0.5">REV 2.6</span>
            <span data-barcode className="ml-3"></span>
          </div>
          <div>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button variant="default">[ DASHBOARD ]</Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button variant="default">[ GET STARTED ]</Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-6 font-mono text-sm tracking-[0.15em] text-[#6B6B6B]">
              &lt; BRUTAL PRE-DEPLOYMENT STRESS TEST FOR AI AGENTS /&gt;
            </p>

            <h1 ref={heroTextRef} className="macro-text flex flex-col overflow-hidden">
              <span className="will-change-transform" data-text="CI FOR">CI FOR</span>
              <span className="will-change-transform" data-text="YOUR AI">YOUR AI</span>
              <span className="will-change-transform" data-text="AGENTS">AGENTS</span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl font-mono text-base text-[#6B6B6B]">
              &gt; CATCH AGENT FAILURES BEFORE YOUR USERS DO
            </p>
            <p className="mx-auto max-w-2xl font-mono text-base text-[#6B6B6B]">
              &gt; RUN ADVERSARIAL TEST SUITES, DETECT ATTACKS, MEASURE RELIABILITY
            </p>
            <p className="mx-auto max-w-2xl font-mono text-base text-[#E61919]">
              &gt; LAUNCH A DEMO. WE&rsquo;LL BRUTALIZE YOUR AGENT IN 60 SECONDS.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="gap-2" onClick={handleLaunchDemo} disabled={demoLoading}>
                {demoLoading ? (
                  <>&gt; LAUNCHING... <ReloadIcon className="h-5 w-5 animate-spin" /></>
                ) : (
                  <>&gt; LAUNCH DEMO <LightningBoltIcon className="h-5 w-5" /></>
                )}
              </Button>
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button variant="outline" size="lg">[ DASHBOARD ]</Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button variant="outline" size="lg">[ GET STARTED ]</Button>
                </a>
              )}
            </div>

            <div className="mt-16 border border-[#2A2A2A] p-2 md:p-6">
              <p className="mb-4 font-mono text-[10px] tracking-[0.15em] text-[#6B6B6B] text-center">&lt; LIVE CASCADE ANALYSIS /&gt;</p>
              <DemoCascadeGraph />
              <div ref={numbersRef} className="mt-4 grid grid-cols-3 gap-2 text-center border-t border-[#2A2A2A] pt-4">
                <div className="border-r border-[#2A2A2A] pr-2">
                  <div className="font-display text-3xl font-black text-[#E61919]"><span data-number="100">0</span>+</div>
                  <div className="mt-1 font-mono text-[9px] tracking-[0.1em] text-[#6B6B6B]">ATTACK VECTORS</div>
                </div>
                <div className="border-r border-[#2A2A2A] pr-2">
                  <div className="font-display text-3xl font-black text-[#E61919]" data-number="9">0</div>
                  <div className="mt-1 font-mono text-[9px] tracking-[0.1em] text-[#6B6B6B]">ATTACK CATEGORIES</div>
                </div>
                <div>
                  <div className="font-display text-3xl font-black text-[#E61919]">0-<span data-number="100">0</span></div>
                  <div className="mt-1 font-mono text-[9px] tracking-[0.1em] text-[#6B6B6B]">RELIABILITY SCORE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section data-crosshair className="border-t-2 border-[#2A2A2A] py-24 md:py-36">
        <div className="container">
          <div className="mb-16 text-center">
            <p className="font-mono text-sm tracking-[0.15em] text-[#6B6B6B]">&lt; FULL ATTACK SURFACE &gt;</p>
            <h2 className="mt-4 font-display text-5xl font-black uppercase tracking-[-0.04em] md:text-7xl">
              BRUTALIZE<br />YOUR AGENT
            </h2>
            <p className="mt-4 font-mono text-sm tracking-[0.1em] text-[#6B6B6B]">
              NINE ATTACK CATEGORIES, PROBE EVERY FAILURE MODE
            </p>
          </div>

          <div ref={featuresRef} className="grid gap-[1px] bg-[#2A2A2A] md:grid-cols-3">
            {[
              { title: "PROMPT INJECTION", desc: "INSTRUCTION OVERRIDE &amp; CONTEXT HIJACKING" },
              { title: "CONTEXT OVERFLOW", desc: "EXTREME INPUT &amp; MEMORY PRESSURE" },
              { title: "LOGIC COLLAPSE", desc: "REASONING FAILURES &amp; CONTRADICTIONS" },
              { title: "JAILBREAK", desc: "SAFETY GUARDRAIL VIOLATIONS" },
              { title: "HALLUCINATION", desc: "FABRICATED RESPONSES &amp; FALSE INFO" },
              { title: "SCHEMA DRIFT", desc: "UNEXPECTED INPUT SHAPES" },
              { title: "MULTI-TENANT LEAK", desc: "CROSS-USER DATA EXTRACTION" },
              { title: "INDIRECT INJECTION", desc: "ATTACKS VIA TOOL OUTPUTS" },
              { title: "MULTI-TURN CRESCENDO", desc: "ESCALATING JAILBREAK OVER TURNS" },
              { title: "MEMORY POISONING", desc: "PERSISTENT MEMORY INJECTION ATTACKS" },
            ].map((feature, i) => {
              const isLast = i === 9;
              return <div key={i} className={`bg-[#121212] will-change-transform ${isLast ? "md:col-span-3 p-8" : "p-6"}`}>
                <span className="font-mono text-[10px] tracking-[0.1em] text-[#E61919]">{isLast ? "[ NEW ]" : `0${i + 1}`}</span>
                <h3 className={`font-display font-bold uppercase tracking-[-0.02em] text-[#EAEAEA] ${isLast ? "mt-3 text-2xl" : "mt-2 text-lg"}`}>
                  {feature.title}
                </h3>
                <p className={`font-mono tracking-[0.05em] text-[#6B6B6B] ${isLast ? "mt-3 text-sm" : "mt-2 text-[11px]"}`}>{feature.desc}</p>
              </div>;
            })}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section data-crosshair className="border-t-2 border-[#2A2A2A] py-24 md:py-48">
        <div className="container">
          <div className="grid gap-16 md:grid-cols-2">
            <div>
              <p className="font-mono text-sm tracking-[0.15em] text-[#6B6B6B]">&lt; FEATURES &gt;</p>
              <h2 className="mt-4 font-display text-5xl font-black uppercase tracking-[-0.04em] md:text-7xl">
                BUILT FOR<br />DEVELOPERS
              </h2>
              <ul className="mt-10 space-y-4">
                {[
                  "REAL-TIME TEST EXECUTION WITH LIVE PROGRESS",
                  "LLM-POWERED DYNAMIC ATTACK GENERATION",
                  "RELIABILITY SCORECARD WITH SEVERITY RATINGS",
                  "FAILURE-CASCADE GRAPH VISUALIZATION",
                  "TEST HISTORY WITH FILTERING AND COMPARISON",
                  "SECURE ENDPOINT MANAGEMENT",
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="mt-0.5 text-[#E61919] font-mono text-sm">&gt;</span>
                    <span className="font-mono text-base tracking-[0.02em] text-[#6B6B6B]">{item}</span>
                  </div>
                ))}
              </ul>
            </div>

            <div className="border border-[#2A2A2A] p-8">
              <p className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B6B]">[ RELIABILITY METRICS ]</p>
              <div className="mt-6 space-y-6">
                <div>
                  <div className="mb-2 font-mono text-sm tracking-[0.08em] text-[#EAEAEA]">SYSTEM SCORE</div>
                  <div className="h-2 border border-[#2A2A2A] bg-[#0A0A0A]">
                    <div className="h-full w-3/4 bg-[#EAEAEA]"></div>
                  </div>
                  <div className="mt-2 font-display text-3xl font-black">75<sub className="font-mono text-sm text-[#6B6B6B]">/100</sub></div>
                </div>

                <div className="space-y-2">
                  {[
                    ["PROMPT INJECTION", "HIGH"],
                    ["CONTEXT OVERFLOW", "LOW"],
                    ["LOGIC COLLAPSE", "MEDIUM"],
                    ["JAILBREAK", "CRITICAL"],
                    ["HALLUCINATION", "LOW"],
                    ["INDIRECT INJECTION", "HIGH"],
                    ["CRESCENDO", "CRITICAL"],
                  ].map(([cat, sev]) => (
                    <div key={cat} className="flex justify-between items-center border-b border-[#1A1A1A] pb-1">
                      <span className="font-mono text-sm tracking-[0.05em] text-[#EAEAEA]">{cat}</span>
                      <span className={`badge ${sev === "CRITICAL" ? "badge-critical" : sev === "HIGH" ? "badge-high" : sev === "MEDIUM" ? "badge-medium" : "badge-low"}`}>
                        {sev}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section data-crosshair className="border-t-2 border-[#2A2A2A] py-20 md:py-28">
        <div className="container">
          <div className="border border-[#2A2A2A] p-16 text-center">
            <p className="font-mono text-sm tracking-[0.15em] text-[#6B6B6B]">&lt; STRESS TEST &gt;</p>
            <h2 className="mt-6 font-display text-5xl font-black uppercase tracking-[-0.04em] md:text-7xl">
              BRUTALIZE YOUR<br />AGENT BEFORE<br />YOUR USERS DO
            </h2>
            <p className="mt-4 font-mono text-sm tracking-[0.1em] text-[#6B6B6B]">
              LAUNCH A DEMO. IT&rsquo;S FREE. YOUR AGENT WILL NOT ENJOY IT.
            </p>
            <div className="mt-10">
              <a href={isAuthenticated ? "/dashboard" : getLoginUrl()}>
                <Button size="lg" className="gap-2">
                  {isAuthenticated ? "> GO TO DASHBOARD" : "> GET STARTED FREE"}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-[#2A2A2A] py-8">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[#E61919] tracking-[0.15em]">®</span>
              <span className="font-mono text-sm tracking-[0.08em]">[ AGENTGUARD ]</span>
            </div>
            <p className="font-mono text-[10px] text-[#8A8A8A]">
              (C) 2026 AGENTGUARD, BUILT FOR HACKHAZARDS &apos;26
            </p>
            <div className="flex gap-4 font-mono text-[10px]">
              <span data-barcode className="mr-2"></span>
              <a href="https://github.com/rushdarshan/AgentGuard" target="_blank" rel="noopener noreferrer" className="text-[#6B6B6B] hover:text-[#EAEAEA] transition-colors">[ GITHUB ]</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
