import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { ATTACK_CATEGORIES, DETECTOR_REGISTRY } from "@/const";

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
          <p className="font-mono text-base text-[#8A8A8A]">AGENT NOT FOUND</p>
        </div>
      </DashboardLayout>
    );
  }

  const severityMap = Object.fromEntries(
    DETECTOR_REGISTRY.map((d: DetectorDef) => [d.name, d.severity])
  );
  const severityColor = (cat: string) => {
    const s = severityMap[cat] as string;
    return s === "critical" ? "#ef4444" : s === "high" ? "#f59e0b" : s === "medium" ? "#34d399" : "#60a5fa";
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        <div>
          <p className="font-mono text-sm tracking-[0.15em] text-[#8A8A8A]">&lt; CONFIG /&gt;</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">TEST SUITE BUILDER</h1>
          <p className="mt-2 font-mono text-[11px] text-[#8A8A8A]">CONFIGURE ATTACK VECTORS FOR {agent.name.toUpperCase()}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[11px]">
            <thead>
              <tr className="text-left text-[#8A8A8A] text-[10px] tracking-[0.1em]">
                <th className="p-3 font-normal border-b border-[#2A2A2A] w-10"><span className="sr-only">Select</span>ON</th>
                <th className="p-3 font-normal border-b border-[#2A2A2A]">[ CATEGORY ]</th>
                <th className="p-3 font-normal border-b border-[#2A2A2A] w-52">[ INTENSITY ]</th>
                <th className="p-3 font-normal border-b border-[#2A2A2A] w-44">[ COUNT ]</th>
              </tr>
            </thead>
            <tbody>
              {ATTACK_CATEGORIES.map((category) => {
                const isSelected = selectedCategories.has(category);
                const color = severityColor(category);
                return (
                  <tr key={category} className={`border-b border-[#1A1A1A] ${isSelected ? "" : "opacity-35"}`}>
                    <td className="p-3">
                      <Checkbox
                        id={category}
                        checked={isSelected}
                        onCheckedChange={() => toggleCategory(category)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-1 h-4 rounded-none" style={{ background: color }} />
                        <Label htmlFor={category} className="cursor-pointer text-xs tracking-[0.05em]">
                          {category.toUpperCase()}
                        </Label>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-[1px] bg-[#2A2A2A]">
                        {(["low", "medium", "high"] as const).map((level) => (
                          <button
                            key={level}
                            className={`${config[category]?.intensity === level ? "btn-solid" : "btn-outline"} flex-1 text-center text-[10px] py-1`}
                            onClick={() => updateConfig(category, "intensity", level)}
                            disabled={!isSelected}
                          >
                            {level.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          value={config[category]?.count || 10}
                          onChange={(e) => updateConfig(category, "count", parseInt(e.target.value))}
                          min={1} max={100} step={1}
                          disabled={!isSelected}
                          className="w-full h-1.5 appearance-none bg-[#2A2A2A] cursor-pointer accent-[#E61919]"
                        />
                        <span className="tabular-nums text-[#EAEAEA] w-6 text-right">{config[category]?.count || 10}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-6 border-t border-[#2A2A2A] py-4">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Zap className="h-4 w-4 text-[#E61919]" />
            <span className="text-[#8A8A8A]">[ SUMMARY ]</span>
            <span>{selectedCategories.size} CATEGORIES</span>
            <span className="text-[#8A8A8A]">|</span>
            <span>
              {Array.from(selectedCategories).reduce(
                (sum, cat) => sum + (config[cat]?.count || 10),
                0
              )} TESTS
            </span>
          </div>
          <div className="ml-auto flex gap-3">
            <Button
              size="lg"
              onClick={handleRunTests}
              disabled={selectedCategories.size === 0 || createTestRun.isPending}
              className="gap-2"
            >
              <Zap className="h-5 w-5" />
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
        </div>
      </div>
    </DashboardLayout>
  );
}
