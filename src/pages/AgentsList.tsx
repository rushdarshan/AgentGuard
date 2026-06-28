import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { PlusIcon, TrashIcon, Pencil1Icon, PlayIcon, ClockIcon } from "@radix-ui/react-icons";
import DashboardLayout from "@/components/DashboardLayout";
import { useState, useEffect } from "react";

export default function AgentsList() {
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const deleteAgent = trpc.agents.delete.useMutation();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [scheduled, setScheduled] = useState<Record<number, boolean>>({});
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (deleteId === null) return;
    if (confirm("DELETE THIS AGENT?")) {
      deleteAgent.mutateAsync({ agentId: deleteId }).finally(() => setDeleteId(null));
    } else {
      setDeleteId(null);
    }
  }, [deleteId]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-sm tracking-[0.15em] text-[#8A8A8A]">&lt; ENDPOINTS /&gt;</p>
            <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">AGENTS</h1>
          </div>
          <Link href="/agents/new">
            <Button className="gap-2">
              <PlusIcon className="h-4 w-4" /> [ ADD AGENT ]
            </Button>
          </Link>
        </div>

        {agents.length > 0 ? (
          <div className="space-y-[1px] bg-[#2A2A2A]">
            {agents.map((agent) => (
              <Card key={agent.id} className="bg-[#121212] p-6 border-0">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex-1">
                    <h3 className="font-mono text-base font-semibold tracking-[0.05em]">{agent.name}</h3>
                    <p className="font-mono text-[11px] text-[#8A8A8A]">{agent.url}</p>
                    {agent.description && (
                      <p className="mt-2 font-mono text-[11px] text-[#8A8A8A]">{agent.description}</p>
                    )}
                    <div className="mt-3">
                      <Link href={`/agents/${agent.id}/test`}>
                        <Button size="sm" className="gap-2 bg-[#E61919] hover:bg-[#CC0000] text-white border-0">
                          <PlayIcon className="h-4 w-4" /> [ RUN FULL ADVERSARIAL SUITE ]
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="gap-2"
                      onClick={() => setScheduled(s => ({ ...s, [agent.id]: !s[agent.id] }))}>
                      <ClockIcon className="h-4 w-4" />
                      {scheduled[agent.id] ? "[ SCHEDULED ✓ ]" : "[ SCHEDULE ]"}
                    </Button>
                    <Link href={`/agents/${agent.id}/test`}>
                      <Button size="sm" variant="outline" className="gap-2">
                        <PlayIcon className="h-4 w-4" /> [ TEST ]
                      </Button>
                    </Link>
                    <Link href={`/agents/${agent.id}/edit`}>
                      <Button size="sm" variant="outline" className="gap-2">
                        <Pencil1Icon className="h-4 w-4" /> [ EDIT ]
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 text-[#E61919] hover:text-[#E61919] hover:border-[#E61919]"
                      onClick={() => setDeleteId(agent.id)}
                    >
                      <TrashIcon className="h-4 w-4" /> [ DELETE ]
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="font-mono text-base text-[#8A8A8A]">NO AGENTS REGISTERED</p>
            <Link href="/agents/new">
              <Button className="mt-4 gap-2">
                <PlusIcon className="h-4 w-4" /> [ CREATE FIRST AGENT ]
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
