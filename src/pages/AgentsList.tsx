import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Plus, Trash2, Edit2, Play } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState, useEffect } from "react";

export default function AgentsList() {
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const deleteAgent = trpc.agents.delete.useMutation();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (deleteId === null) return;
    if (confirm("Are you sure you want to delete this agent? This action cannot be undone.")) {
      deleteAgent.mutateAsync({ agentId: deleteId }).finally(() => setDeleteId(null));
    } else {
      setDeleteId(null);
    }
  }, [deleteId]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">Agent Endpoints</h1>
          <Link href="/agents/new">
            <Button className="gap-2">
              <Plus className="h-5 w-5" />
              Add Agent
            </Button>
          </Link>
        </div>

        {agents.length > 0 ? (
          <div className="space-y-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="p-6">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">{agent.url}</p>
                    {agent.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{agent.description}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/agents/${agent.id}/test`}>
                      <Button size="sm" variant="outline" className="gap-2">
                        <Play className="h-4 w-4" />
                        Test
                      </Button>
                    </Link>
                    <Link href={`/agents/${agent.id}/edit`}>
                      <Button size="sm" variant="outline" className="gap-2">
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 text-red-400 hover:text-red-300"
                      onClick={() => setDeleteId(agent.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="mb-4 text-lg text-muted-foreground">No agents registered yet</p>
            <Link href="/agents/new">
              <Button className="gap-2">
                <Plus className="h-5 w-5" />
                Create Your First Agent
              </Button>
            </Link>
          </Card>
        )}
      </div>


    </DashboardLayout>
  );
}
