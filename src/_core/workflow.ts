// ponytail: Render Workflow definition stub. Full integration when Render account provisioned.

export interface WorkflowStep {
  name: string;
  run: string;
}

export function buildTestWorkflow(params: {
  testRunId: number;
  agentUrl: string;
  categories: string[];
}): { steps: WorkflowStep[] } {
  return {
    steps: [
      { name: "generate-attacks", run: `node scripts/generate-attacks.mjs ${params.testRunId}` },
      { name: "execute-attacks", run: `node scripts/execute-attacks.mjs ${params.testRunId} ${params.agentUrl}` },
      { name: "evaluate-results", run: `node scripts/evaluate-results.mjs ${params.testRunId}` },
      { name: "compute-score", run: `node scripts/compute-score.mjs ${params.testRunId}` },
      { name: "save-results", run: `node scripts/save-results.mjs ${params.testRunId}` },
    ],
  };
  // ponytail: Render API integration deferred. Falls back to in-process execution.
}
