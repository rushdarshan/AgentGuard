import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { toast } from "sonner";
import { LightningBoltIcon } from "@radix-ui/react-icons";
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
      toast.error("SELECT AT LEAST ONE ATTACK CATEGORY");
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
      toast.success("TEST RUN STARTED");
      setLocation(`/runs/${result.testRunId}`);
    } catch (error) {
      toast.error("FAILED TO START TEST RUN");
    }
  };

  if (!agent) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <p className="font-mono text-sm text-[#6B6B6B]">AGENT NOT FOUND</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        <div>
          <p className="font-mono text-xs tracking-[0.15em] text-[#6B6B6B]">&lt; CONFIG /&gt;</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">TEST SUITE BUILDER</h1>
          <p className="mt-2 font-mono text-[11px] text-[#6B6B6B]">CONFIGURE ATTACK VECTORS FOR {agent.name.toUpperCase()}</p>
        </div>

        <Card className="p-8">
          <div className="mb-8">
            <p className="mb-4 font-mono text-[10px] tracking-[0.1em] text-[#6B6B6B]">[ SELECT ATTACK CATEGORIES ]</p>
            <div className="space-y-[1px] bg-[#2A2A2A]">
              {ATTACK_CATEGORIES.map((category) => (
                <Card key={category} className="bg-[#121212] border-0 p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={category}
                      checked={selectedCategories.has(category)}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    <Label htmlFor={category} className="cursor-pointer font-mono text-sm tracking-[0.05em]">
                      {category.toUpperCase()}
                    </Label>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="border-t border-[#2A2A2A] pt-8">
            <p className="mb-6 font-mono text-[10px] tracking-[0.1em] text-[#6B6B6B]">[ CONFIGURE ATTACK PARAMETERS ]</p>
            <div className="space-y-[1px] bg-[#2A2A2A]">
              {ATTACK_CATEGORIES.map((category) => (
                <Card
                  key={category}
                  className={`bg-[#121212] border-0 p-6 ${selectedCategories.has(category) ? "" : "opacity-40"}`}
                >
                  <h3 className="mb-4 font-mono text-sm font-semibold tracking-[0.05em]">{category.toUpperCase()}</h3>

                  <div className="space-y-6">
                    <div>
                      <Label className="mb-3 block font-mono text-[11px] text-[#6B6B6B]">
                        INTENSITY: <span className="text-[#EAEAEA]">{config[category]?.intensity.toUpperCase() || "MEDIUM"}</span>
                      </Label>
                      <div className="flex gap-[1px] bg-[#2A2A2A]">
                        {(["low", "medium", "high"] as const).map((level) => (
                          <button
                            key={level}
                            className={`btn-${config[category]?.intensity === level ? "solid" : "outline"} flex-1 text-center`}
                            onClick={() => updateConfig(category, "intensity", level)}
                            disabled={!selectedCategories.has(category)}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-3 block font-mono text-[11px] text-[#6B6B6B]">
                        TEST COUNT: <span className="text-[#EAEAEA]">{config[category]?.count || 10}</span>
                      </Label>
                      <input
                        type="range"
                        value={config[category]?.count || 10}
                        onChange={(e) => updateConfig(category, "count", parseInt(e.target.value))}
                        min={1}
                        max={100}
                        step={1}
                        disabled={!selectedCategories.has(category)}
                        className="w-full h-2 appearance-none bg-[#2A2A2A] cursor-pointer accent-[#E61919]"
                      />
                      <p className="mt-2 font-mono text-[10px] text-[#6B6B6B]">&gt; RECOMMENDED: 10-20 TESTS PER CATEGORY</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Card className="mt-8 border border-[#2A2A2A] bg-[#121212] p-6">
            <div className="mb-4 flex items-center gap-2">
              <LightningBoltIcon className="h-5 w-5 text-[#E61919]" />
              <p className="font-mono text-sm tracking-[0.05em]">[ TEST SUMMARY ]</p>
            </div>
            <div className="space-y-2 font-mono text-xs">
              <p>&gt; <span className="text-[#6B6B6B]">CATEGORIES:</span> <span className="font-semibold">{selectedCategories.size}</span></p>
              <p>&gt; <span className="text-[#6B6B6B]">TOTAL TESTS:</span> <span className="font-semibold">
                {Array.from(selectedCategories).reduce(
                  (sum, cat) => sum + (config[cat]?.count || 10),
                  0
                )}
              </span></p>
              <p className="text-[#6B6B6B]">&gt; LLM WILL GENERATE NOVEL ATTACKS TAILORED TO YOUR AGENT.</p>
            </div>
          </Card>

          <div className="mt-8 flex gap-3">
            <Button
              size="lg"
              onClick={handleRunTests}
              disabled={selectedCategories.size === 0 || createTestRun.isPending}
              className="gap-2"
            >
              <LightningBoltIcon className="h-5 w-5" />
              [ EXECUTE ]
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/agents")}
            >
              [ CANCEL ]
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}