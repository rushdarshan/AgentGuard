import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { Checkbox } from "@/components/ui/checkbox";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { ATTACK_CATEGORIES } from "@/const";

type AttackCategory = (typeof ATTACK_CATEGORIES)[number];

type TestConfig = {
  [K in AttackCategory]?: {
    intensity: "low" | "medium" | "high";
    count: number;
  };
};

export default function TestBuilder() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const agentId = parseInt(params?.id || "0");

  const { data: agent } = trpc.agents.get.useQuery({ agentId });
  const createTestRun = trpc.testRuns.create.useMutation();

  const [selectedCategories, setSelectedCategories] = useState<Set<AttackCategory>>(
    new Set(ATTACK_CATEGORIES)
  );
  const [config, setConfig] = useState<TestConfig>(
    ATTACK_CATEGORIES.reduce(
      (acc, cat) => ({
        ...acc,
        [cat]: { intensity: "medium" as const, count: 10 },
      }),
      {} as TestConfig
    )
  );

  const toggleCategory = (category: AttackCategory) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };

  const updateConfig = (
    category: AttackCategory,
    field: "intensity" | "count",
    value: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || { intensity: "medium" as const, count: 10 }),
        [field]: value,
      },
    }));
  };

  const handleRunTests = async () => {
    if (selectedCategories.size === 0) {
      toast.error("Select at least one attack category");
      return;
    }

    const finalConfig: Record<string, { intensity: string; count: number }> = {};
    selectedCategories.forEach((cat) => {
      finalConfig[cat] = config[cat] || { intensity: "medium", count: 10 };
    });

    try {
      const result = await createTestRun.mutateAsync({
        agentId,
        config: finalConfig as any,
      });
      toast.success("Test run started");
      setLocation(`/runs/${result.testRunId}`);
    } catch (error) {
      toast.error("Failed to start test run");
    }
  };

  if (!agent) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <p className="text-muted-foreground">Agent not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="mb-2 text-4xl font-bold">Test Suite Builder</h1>
          <p className="text-muted-foreground">Configure adversarial attacks for {agent.name}</p>
        </div>

        <Card className="p-8">
          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">Select Attack Categories</h2>
            <div className="space-y-4">
              {ATTACK_CATEGORIES.map((category) => (
                <div key={category} className="flex items-center gap-3">
                  <Checkbox
                    id={category}
                    checked={selectedCategories.has(category)}
                    onCheckedChange={() => toggleCategory(category)}
                  />
                  <Label htmlFor={category} className="cursor-pointer font-medium">
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-8">
            <h2 className="mb-6 text-2xl font-semibold">Configure Attack Parameters</h2>
            <div className="space-y-8">
              {ATTACK_CATEGORIES.map((category) => (
                <div
                  key={category}
                  className={`rounded-lg p-6 ${
                    selectedCategories.has(category)
                      ? "border border-accent/50 bg-accent/5"
                      : "border border-border/50 bg-card/30 opacity-50"
                  }`}
                >
                  <h3 className="mb-4 font-semibold">{category}</h3>

                  <div className="space-y-6">
                    <div>
                      <Label className="mb-3 block text-sm">
                        Intensity:{" "}
                        <span className="font-bold text-accent">
                          {config[category]?.intensity || "medium"}
                        </span>
                      </Label>
                      <div className="flex gap-3">
                        {(["low", "medium", "high"] as const).map((level) => (
                          <Button
                            key={level}
                            size="sm"
                            variant={
                              config[category]?.intensity === level ? "default" : "outline"
                            }
                            onClick={() => updateConfig(category, "intensity", level)}
                            disabled={!selectedCategories.has(category)}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-3 block text-sm">
                        Number of Tests:{" "}
                        <span className="font-bold text-accent">
                          {config[category]?.count || 10}
                        </span>
                      </Label>
                      <input
                        type="range"
                        value={config[category]?.count || 10}
                        onChange={(e) => updateConfig(category, "count", parseInt(e.target.value))}
                        min={1}
                        max={100}
                        step={1}
                        disabled={!selectedCategories.has(category)}
                        className="w-full h-2 rounded-full appearance-none bg-border cursor-pointer accent-[#00d9ff]"
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Recommended: 10-20 tests per category
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-border/50 bg-card/30 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              <h3 className="font-semibold">Test Summary</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Categories:</span>{" "}
                <span className="font-semibold">{selectedCategories.size}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Total Tests:</span>{" "}
                <span className="font-semibold">
                  {Array.from(selectedCategories).reduce(
                    (sum, cat) => sum + (config[cat]?.count || 10),
                    0
                  )}
                </span>
              </p>
              <p className="text-muted-foreground">
                LLM will generate novel attacks tailored to your agent's description.
              </p>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button
              size="lg"
              onClick={handleRunTests}
              disabled={selectedCategories.size === 0 || createTestRun.isPending}
              className="gap-2"
            >
              <Zap className="h-5 w-5" />
              Run Test Suite
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/agents")}
            >
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
