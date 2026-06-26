import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TestRunHistory() {
  const { data: testRuns = [] } = trpc.testRuns.list.useQuery({});

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterScoreMin, setFilterScoreMin] = useState<number>(0);
  const [filterScoreMax, setFilterScoreMax] = useState<number>(100);

  const filteredRuns = testRuns.filter((run) => {
    if (filterStatus !== "all" && run.status !== filterStatus) return false;
    const score = run.reliabilityScore || 0;
    if (score < filterScoreMin || score > filterScoreMax) return false;
    return true;
  });

  const sortedRuns = [...filteredRuns].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <h1 className="page-title text-4xl font-bold">Run history</h1>

        {/* Filters */}
        <Card className="card-hover p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label className="mb-2 block text-sm">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block text-sm">Min Score</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={filterScoreMin}
                onChange={(e) => setFilterScoreMin(parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm">Max Score</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={filterScoreMax}
                onChange={(e) => setFilterScoreMax(parseInt(e.target.value) || 100)}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterScoreMin(0);
                  setFilterScoreMax(100);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </Card>

        {/* Results */}
        {sortedRuns.length > 0 ? (
          <div className="space-y-3">
            {sortedRuns.map((run) => (
              <Link key={run.id} href={`/runs/${run.id}`}>
                <Card className="card-hover p-6">
                  <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="font-semibold">Run #{run.id}</h3>
                        <span
                          className={`text-xs font-medium ${
                            run.status === "completed"
                              ? "text-green-400"
                              : run.status === "running"
                                ? "text-blue-400"
                                : run.status === "failed"
                                  ? "text-red-400"
                                  : "text-yellow-400"
                          }`}
                        >
                          {run.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {run.totalTests} tests • {run.passedTests} passed • {run.failedTests}{" "}
                        failed
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(run.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                         <p className="text-2xl font-bold">{run.totalTests > 0 ? (run.passedTests / run.totalTests * 100).toFixed(1) : "0"}%</p>
                      </div>

                      <div
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          (run.reliabilityScore || 0) >= 80
                            ? "badge-low"
                            : (run.reliabilityScore || 0) >= 60
                              ? "badge-medium"
                              : (run.reliabilityScore || 0) >= 40
                                ? "badge-high"
                                : "badge-critical"
                        }`}
                      >
                        {(run.reliabilityScore || 0) >= 80
                          ? "Healthy"
                          : (run.reliabilityScore || 0) >= 60
                            ? "Caution"
                            : (run.reliabilityScore || 0) >= 40
                              ? "Warning"
                              : "Critical"}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="card-hover p-12 text-center">
            <p className="text-muted-foreground">No test runs match your filters</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
