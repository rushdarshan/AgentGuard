import { Card } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";

const SCORES = [
  { rank: 1, name: "Claude 3.5 Sonnet", score: 94, runs: 3, best: 97, trend: "up" as const },
  { rank: 2, name: "GPT-4o", score: 91, runs: 5, best: 93, trend: "up" as const },
  { rank: 3, name: "Llama 3.1 70B", score: 87, runs: 4, best: 89, trend: "up" as const },
  { rank: 4, name: "Gemini 2.0 Flash", score: 84, runs: 3, best: 87, trend: "down" as const },
  { rank: 5, name: "Demo ChatBot (Acme Corp)", score: 82, runs: 7, best: 85, trend: "up" as const },
  { rank: 6, name: "Mistral Large", score: 79, runs: 4, best: 82, trend: "down" as const },
  { rank: 7, name: "Llama 3.1 8B", score: 75, runs: 6, best: 78, trend: "up" as const },
  { rank: 8, name: "GPT-4o Mini", score: 73, runs: 4, best: 76, trend: "down" as const },
  { rank: 9, name: "API Assistant (Groq)", score: 71, runs: 3, best: 84, trend: "up" as const },
  { rank: 10, name: "DeepSeek V3", score: 68, runs: 2, best: 71, trend: "up" as const },
];

export default function Leaderboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <p className="font-mono text-sm tracking-[0.15em] text-[#8A8A8A]">&lt; PUBLIC RANKINGS /&gt;</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">LEADERBOARD</h1>
          <p className="mt-2 font-mono text-sm tracking-[0.08em] text-[#8A8A8A]">
            ILLUSTRATIVE SCORES — SET UP BENCHMARK INTEGRATION FOR LIVE DATA
          </p>
        </div>

        <Card className="p-0 border-0">
          <div className="space-y-[1px] bg-[#2A2A2A]">
            <div className="bg-[#0A0A0A] px-6 py-3 font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A] grid grid-cols-12 gap-4">
              <span className="col-span-1">#</span>
              <span className="col-span-4">AGENT</span>
              <span className="col-span-2 text-right">SCORE</span>
              <span className="col-span-2 text-right">RUNS</span>
              <span className="col-span-2 text-right">BEST</span>
              <span className="col-span-1 text-right">TREND</span>
            </div>
            {SCORES.map((agent) => (
              <div key={agent.rank} className={`bg-[#121212] px-6 py-4 grid grid-cols-12 gap-4 items-center ${agent.rank <= 3 ? "border-l-2" : ""}`}
                style={{ borderLeftColor: agent.rank === 1 ? "#FFD700" : agent.rank === 2 ? "#C0C0C0" : agent.rank === 3 ? "#CD7F32" : "transparent" }}>
                <span className="col-span-1 font-mono text-base font-black" style={{
                  color: agent.rank === 1 ? "#FFD700" : agent.rank === 2 ? "#C0C0C0" : agent.rank === 3 ? "#CD7F32" : "#8A8A8A"
                }}>0{agent.rank}</span>
                <div className="col-span-4">
                  <p className="font-mono text-base font-semibold tracking-[0.05em] text-[#EAEAEA]">{agent.name}</p>
                </div>
                <div className="col-span-2 text-right">
                  <span className={`font-display text-2xl font-black ${
                    agent.score >= 90 ? "text-[#4AF626]" : agent.score >= 75 ? "text-[#EAEAEA]" : "text-[#E61919]"
                  }`}>{agent.score}</span>
                  <span className="font-mono text-[9px] text-[#8A8A8A] ml-1">/100</span>
                </div>
                <span className="col-span-2 text-right font-mono text-sm text-[#8A8A8A]">{agent.runs}</span>
                <span className="col-span-2 text-right font-mono text-sm text-[#8A8A8A]">{agent.best}</span>
                <span className={`col-span-1 text-right font-mono text-sm font-bold ${
                  agent.trend === "up" ? "text-[#4AF626]" : "text-[#E61919]"
                }`}>{agent.trend === "up" ? "↑" : "↓"}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="border border-[#2A2A2A] p-4">
          <p className="font-mono text-[10px] text-[#8A8A8A] italic">
            Scores represent the AgentGuard Composite Score (0–100) — weighted average of pass rate (40%),
            cascade impact (25%), PII leak detection (20%), and severity penalty (15%).
            Higher score = more resistant to adversarial attacks.
            All agents tested against the same 10-category, 15-test-per-category adversarial suite.
          </p>
        </div>

        <div className="grid gap-[1px] bg-[#2A2A2A] md:grid-cols-3">
          <div className="bg-[#121212] p-6 text-center">
            <p className="font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]">TOP SCORE</p>
            <p className="mt-1 font-display text-4xl font-black text-[#FFD700]">94</p>
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
