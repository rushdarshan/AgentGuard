import { Card } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const SCORES = [
  { rank: 1, name: "Claude 3.5 Sonnet", score: 94, runs: 3, best: 97, trend: "up" as const, trendVal: "+4", vendor: "anthropic", subscores: { injection: 92, memory: 96, logic: 98 } },
  { rank: 2, name: "GPT-4o", score: 91, runs: 5, best: 93, trend: "up" as const, trendVal: "+2", vendor: "openai", subscores: { injection: 89, memory: 93, logic: 95 } },
  { rank: 3, name: "Llama 3.1 70B", score: 87, runs: 4, best: 89, trend: "up" as const, trendVal: "+1", vendor: "meta", subscores: { injection: 85, memory: 88, logic: 90 } },
  { rank: 4, name: "Gemini 2.0 Flash", score: 84, runs: 3, best: 87, trend: "down" as const, trendVal: "-3", vendor: "google", subscores: { injection: 82, memory: 86, logic: 87 } },
  { rank: 5, name: "Demo ChatBot (Acme Corp)", score: 82, runs: 7, best: 85, trend: "up" as const, trendVal: "+1", vendor: "acme", subscores: { injection: 80, memory: 83, logic: 85 } },
  { rank: 6, name: "Mistral Large", score: 79, runs: 4, best: 82, trend: "down" as const, trendVal: "-2", vendor: "mistral", subscores: { injection: 75, memory: 82, logic: 81 } },
  { rank: 7, name: "Llama 3.1 8B", score: 75, runs: 6, best: 78, trend: "up" as const, trendVal: "+2", vendor: "meta", subscores: { injection: 70, memory: 76, logic: 78 } },
  { rank: 8, name: "GPT-4o Mini", score: 73, runs: 4, best: 76, trend: "down" as const, trendVal: "-1", vendor: "openai", subscores: { injection: 68, memory: 74, logic: 76 } },
  { rank: 9, name: "API Assistant (Groq)", score: 71, runs: 3, best: 84, trend: "up" as const, trendVal: "+5", vendor: "groq", subscores: { injection: 65, memory: 75, logic: 72 } },
  { rank: 10, name: "DeepSeek V3", score: 68, runs: 2, best: 71, trend: "up" as const, trendVal: "+2", vendor: "deepseek", subscores: { injection: 60, memory: 72, logic: 70 } },
];

export default function Leaderboard() {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const rows = rowsRef.current?.querySelectorAll("[data-rank-row]");
    if (rows && rows.length > 0) {
      gsap.from(rows, {
        y: 30,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "power3.out",
      });
    }
  }, { scope: rowsRef, dependencies: [rankings] });
  
  const getVendorColor = (vendor: string) => {
    switch (vendor) {
      case "anthropic": return "bg-[#D97757]";
      case "openai": return "bg-[#10a37f]";
      case "meta": return "bg-[#0668E1]";
      case "google": return "bg-[#4285F4]";
      case "mistral": return "bg-[#FBA918]";
      case "deepseek": return "bg-[#4D6BFE]";
      default: return "bg-[#8A8A8A]";
    }
  };
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <p className="font-mono text-sm tracking-[0.15em] text-[#8A8A8A]">&lt; PUBLIC RANKINGS /&gt;</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">LEADERBOARD</h1>
          <div className="mt-4 flex gap-4">
            <div className="inline-block border border-[#2A2A2A]/50 bg-[#121212] px-3 py-1.5">
              <span className="font-mono text-xs tracking-[0.1em] text-[#8A8A8A] mr-2">BENCHMARK SOURCE:</span>
              <span className="font-mono text-xs tracking-[0.1em] text-[#EAEAEA]">SYNTHETIC DATASET V2.1</span>
            </div>
            <div className="inline-block border border-[#2A2A2A]/50 bg-[#121212] px-3 py-1.5">
              <span className="font-mono text-xs tracking-[0.1em] text-[#8A8A8A] mr-2">LAST UPDATED:</span>
              <span className="font-mono text-xs tracking-[0.1em] text-[#EAEAEA]">TODAY, 09:41 UTC</span>
            </div>
          </div>
        </div>

        <Card className="p-0 border-0 overflow-x-auto">
          <div ref={rowsRef} className="space-y-[1px] bg-[#2A2A2A]">
            <div className="bg-[#0A0A0A] px-4 md:px-6 py-3 font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A] grid grid-cols-12 gap-2 md:gap-4">
              <span className="col-span-1">#</span>
              <span className="col-span-4">AGENT</span>
              <span className="col-span-2 text-right">SCORE</span>
              <span className="col-span-2 text-right">RUNS</span>
              <span className="col-span-2 text-right">BEST</span>
              <span className="col-span-1 text-right">TREND</span>
            </div>
            {SCORES.map((agent) => (
              <div key={agent.rank} data-rank-row className="border-b border-[#2A2A2A]/30 last:border-0">
                <div 
                  className={`bg-[#121212] hover:bg-[#1A1A1A] transition-colors px-4 md:px-6 py-4 grid grid-cols-12 gap-2 md:gap-4 items-center cursor-pointer ${expandedRow === agent.rank ? 'bg-[#1A1A1A]' : ''}`}
                  onClick={() => setExpandedRow(expandedRow === agent.rank ? null : agent.rank)}
                >
                  <span className="col-span-1 font-mono text-sm md:text-base font-black text-[#8A8A8A]">{String(agent.rank).padStart(3, '0')}</span>
                  <div className="col-span-4 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getVendorColor(agent.vendor)}`}></div>
                    <p className="font-mono text-sm md:text-base font-semibold tracking-[0.05em] text-[#EAEAEA] truncate">{agent.name}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`font-display text-xl md:text-2xl font-black ${
                      agent.score >= 90 ? "text-[#4AF626]" : agent.score >= 75 ? "text-[#EAEAEA]" : "text-[#E61919]"
                    }`}>{agent.score}</span>
                    <span className="font-mono text-[9px] text-[#8A8A8A] ml-1">/100</span>
                  </div>
                  <span className="col-span-2 text-right font-mono text-xs md:text-sm text-[#8A8A8A]">{agent.runs}</span>
                  <span className="col-span-2 text-right font-mono text-xs md:text-sm text-[#8A8A8A]">{agent.best}</span>
                  <div className="col-span-1 flex justify-end">
                    <span className={`font-mono text-xs font-bold px-1.5 py-0.5 border ${
                      agent.trend === "up" ? "text-[#4AF626] border-[#4AF626]/30 bg-[#4AF626]/5" : "text-[#E61919] border-[#E61919]/30 bg-[#E61919]/5"
                    }`}>{agent.trend === "up" ? "↑" : "↓"} {agent.trendVal}</span>
                  </div>
                </div>
                {expandedRow === agent.rank && (
                  <div className="bg-[#0A0A0A] border-t border-[#2A2A2A]/50 px-6 py-4 grid grid-cols-3 gap-6">
                    <div className="border border-[#2A2A2A] p-3">
                      <span className="block font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]">PROMPT INJECTION</span>
                      <span className="block font-display text-2xl text-[#EAEAEA] mt-1">{agent.subscores.injection}%</span>
                    </div>
                    <div className="border border-[#2A2A2A] p-3">
                      <span className="block font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]">CONTEXT/MEMORY</span>
                      <span className="block font-display text-2xl text-[#EAEAEA] mt-1">{agent.subscores.memory}%</span>
                    </div>
                    <div className="border border-[#2A2A2A] p-3">
                      <span className="block font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]">LOGIC COLLAPSE</span>
                      <span className="block font-display text-2xl text-[#EAEAEA] mt-1">{agent.subscores.logic}%</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="border border-[#2A2A2A] p-4">
          <p className="font-mono text-xs text-[#EAEAEA]">
            Scores represent the AgentGuard Composite Score (0–100) — weighted average of pass rate (40%),
            cascade impact (25%), PII leak detection (20%), and severity penalty (15%).
            Higher score = more resistant to adversarial attacks.
            All agents tested against the same 10-category, 15-test-per-category adversarial suite.
          </p>
        </div>

        <div className="grid gap-[1px] bg-[#2A2A2A] md:grid-cols-3">
          <div className="bg-[#121212] p-6 text-center">
            <p className="font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]">TOP SCORE</p>
            <p className="mt-1 font-display text-4xl font-black text-[#EAEAEA]">94</p>
            <p className="font-mono text-sm text-[#8A8A8A]">CLAUDE 3.5 SONNET</p>
          </div>
          <div className="bg-[#121212] p-6 text-center">
            <p className="font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]">AVERAGE</p>
            <p className="mt-1 font-display text-4xl font-black text-[#EAEAEA]">80.4</p>
            <p className="font-mono text-sm text-[#8A8A8A]">ACROSS 10 AGENTS</p>
          </div>
          <div className="bg-[#121212] p-6 text-center">
            <p className="font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]">LOWEST</p>
            <p className="mt-1 font-display text-4xl font-black text-[#E61919]">68</p>
            <p className="font-mono text-sm text-[#8A8A8A]">DEEPSEEK V3</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
