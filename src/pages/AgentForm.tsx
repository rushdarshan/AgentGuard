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
        toast.success("Agent updated successfully");
      } else {
        await createAgent.mutateAsync(formData);
        toast.success("Agent created successfully");
      }
      setLocation("/agents");
    } catch (error) {
      toast.error("Failed to save agent");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <h1 className="font-serif text-4xl font-light tracking-[-0.02em] mb-8">
          {isEdit ? "Edit Agent" : "Register New Agent"}
        </h1>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                placeholder="e.g., Customer Support Bot"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="url">Endpoint URL</Label>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this agent does (helps with attack generation)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="authHeaders">Authentication Headers (JSON)</Label>
              <Textarea
                id="authHeaders"
                placeholder='{"Authorization": "Bearer YOUR_TOKEN", "X-API-Key": "YOUR_KEY"}'
                value={formData.authHeaders}
                onChange={(e) => setFormData({ ...formData, authHeaders: e.target.value })}
                rows={4}
              />
              <p className="mt-2 text-xs text-[#787774]">
                Optional. Provide headers as JSON. Will be encrypted and used for all test requests.
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={createAgent.isPending || updateAgent.isPending}>
                {isEdit ? "Update Agent" : "Create Agent"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/agents")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
