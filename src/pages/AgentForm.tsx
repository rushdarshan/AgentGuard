import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AgentForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const agentId = params?.id ? parseInt(params.id) : null;
  const isEdit = !!agentId;

  const { data: agent } = trpc.agents.get.useQuery(
    { agentId: agentId! },
    { enabled: !!agentId }
  );

  const createAgent = trpc.agents.create.useMutation();
  const updateAgent = trpc.agents.update.useMutation();

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    description: "",
    authHeaders: "",
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        url: agent.url,
        description: agent.description || "",
        authHeaders: agent.authHeaders || "",
      });
    }
  }, [agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEdit && agentId) {
        await updateAgent.mutateAsync({
          agentId,
          ...formData,
        });
        toast.success("AGENT UPDATED");
      } else {
        await createAgent.mutateAsync(formData);
        toast.success("AGENT REGISTERED");
      }
      setLocation("/agents");
    } catch (error) {
      toast.error("FAILED TO SAVE AGENT");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-8">
        <div>
          <p className="font-mono text-xs tracking-[0.15em] text-[#6B6B6B]">&lt; REGISTRATION /&gt;</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">
            {isEdit ? "EDIT AGENT" : "REGISTER AGENT"}
          </h1>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">AGENT NAME</Label>
              <Input
                id="name"
                placeholder="e.g. Customer Support Bot"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="url">ENDPOINT URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://api.example.com/agent"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">DESCRIPTION</Label>
              <Textarea
                id="description"
                placeholder="Describe what this agent does (helps with attack generation)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="authHeaders">AUTH HEADERS (JSON)</Label>
              <Textarea
                id="authHeaders"
                placeholder='{"Authorization": "Bearer TOKEN", "X-API-Key": "KEY"}'
                value={formData.authHeaders}
                onChange={(e) => setFormData({ ...formData, authHeaders: e.target.value })}
                rows={4}
              />
              <p className="mt-2 font-mono text-[10px] text-[#6B6B6B]">
                &gt; OPTIONAL. PROVIDED AS JSON. WILL BE ENCRYPTED AND USED FOR ALL TEST REQUESTS.
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={createAgent.isPending || updateAgent.isPending}>
                [ {isEdit ? "UPDATE" : "REGISTER"} ]
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/agents")}
              >
                [ CANCEL ]
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}