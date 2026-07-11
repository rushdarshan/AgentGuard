import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Plus, Trash2, Pencil, Clock, Zap } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState, useEffect, useMemo } from "react";

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s AGO`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h AGO`;
  const days = Math.floor(hours / 24);
  return `${days}d AGO`;
}

function ReliabilityBadge({ score }: { score: number }) {
  const color = score >= 90 ? "#22C55E" : score >= 70 ? "#808080" : "#D82C20";
  return (
    <span
      className="font-mono text-[10px] tracking-[0.05em] px-1.5 py-0.5 border"
      style={{ borderColor: `${color}40`, color, backgroundColor: `${color}08` }}
    >
      {score}%
    </span>
  );
}

function StatusDot({ hasRuns }: { hasRuns: boolean }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5"
      style={{ backgroundColor: hasRuns ? "#22C55E" : "#2A2A2A" }}
    />
  );
}

export default function AgentsList() {
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const { data: allRuns = [] } = trpc.testRuns.list.useQuery({});
  const deleteAgent = trpc.agents.delete.useMutation();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [scheduled, setScheduled] = useState<Record<number, boolean>>({});
  const [, setLocation] = useLocation();

  const lastRunByAgent = useMemo(() => {
    const map = new Map<number, { lastRunAt: Date | null; reliabilityScore: number | null }>();
    for (const agent of agents) {
      const agentRuns = allRuns
        .filter((r: any) => r.agentId === agent.id)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const last = agentRuns[0] ?? null;
      map.set(agent.id, {
        lastRunAt: last?.completedAt ? new Date(last.completedAt) : last?.createdAt ? new Date(last.createdAt) : null,
        reliabilityScore: last?.reliabilityScore ?? null,
      });
    }
    return map;
  }, [agents, allRuns]);

  useEffect(() => {
    if (deleteId === null) return;
    if (confirm("DELETE THIS AGENT?")) {
      deleteAgent.mutateAsync({ agentId: deleteId }).catch(() => setError('Delete failed')).finally(() => setDeleteId(null));
    } else {
      setDeleteId(null);
    }
  }, [deleteId]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-sm tracking-[0.15em] text-[#808080]">&lt; ENDPOINTS /&gt;</p>
            <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">AGENTS</h1>
          </div>
          <Link href="/agents/new">
            <Button className="gap-2 px-5 py-3">
              <Plus className="h-4 w-4" /> [ ADD AGENT ]
            </Button>
          </Link>
        </div>

        {agents.length > 0 ? (
          <div className="space-y-[1px] bg-[#2A2A2A]">
            {agents.map((agent) => {
              const info = lastRunByAgent.get(agent.id);
              const hasRuns = info?.lastRunAt !== null && info?.lastRunAt !== undefined;
              const reliability = info?.reliabilityScore;
              return (
                <Card key={agent.id} className="card-hover bg-[#111111] py-3.5 px-4 border-0 group">
                  <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex-1 flex gap-4 items-center">
                      <div className="w-10 h-10 border border-[#2A2A2A] bg-[#0A0A0A] flex items-center justify-center">
                        <StatusDot hasRuns={!!hasRuns} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusDot hasRuns={!!hasRuns} />
                          <h3 className="font-mono text-base font-semibold tracking-[0.05em] text-[#F5F5F5]">{agent.name}</h3>
                          {reliability !== null && reliability !== undefined && (
                            <ReliabilityBadge score={reliability} />
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-[#808080] mt-1">{agent.url}</p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="hidden md:block text-right">
                        <span className="block font-mono text-[10px] text-[#808080]">LAST RUN</span>
                        <span className="block font-mono text-sm text-[#F5F5F5] mt-0.5">
                          {hasRuns && info.lastRunAt ? formatTimeAgo(info.lastRunAt) : "\u2014"}
                        </span>
                      </div>
                      <div className="hidden md:block text-right">
                        <span className="block font-mono text-[10px] text-[#808080]">RELIABILITY</span>
                        <span className="block font-mono text-sm text-[#F5F5F5] mt-0.5">
                          {reliability !== null && reliability !== undefined ? `${reliability}%` : "\u2014"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/agents/${agent.id}/test`}>
                          <button className="flex items-center gap-2 px-4 py-2 bg-[#D82C20] hover:bg-[#D82C20] text-white font-mono text-xs tracking-[0.1em] font-bold transition-all group-hover:shadow-[0_0_12px_rgba(230,25,25,0.3)]">
                            <Zap className="h-3 w-3" /> DISPATCH TEST
                          </button>
                        </Link>

                        <div className="flex items-center ml-2 border border-[#2A2A2A]">
                          <button title="Schedule" className="w-8 h-8 flex items-center justify-center bg-transparent text-[#808080] hover:bg-[#2A2A2A] hover:text-[#F5F5F5] transition-colors" onClick={() => setScheduled(s => ({ ...s, [agent.id]: !s[agent.id] }))}>
                            <Clock className="h-3 w-3" />
                          </button>
                          <a href={`/agents/${agent.id}/edit`} className="w-8 h-8 flex items-center justify-center bg-transparent text-[#808080] border-l border-[#2A2A2A] hover:bg-[#2A2A2A] hover:text-[#F5F5F5] transition-colors"><Pencil className="h-3 w-3" /></a>
                          <button title="Delete" className="w-8 h-8 flex items-center justify-center bg-transparent text-[#D82C20] border-l border-[#2A2A2A] hover:bg-[#D82C20]/10 transition-colors" onClick={() => setDeleteId(agent.id)}>
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="font-mono text-base text-[#808080]">NO AGENTS REGISTERED</p>
            <Link href="/agents/new">
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> [ CREATE FIRST AGENT ]
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
