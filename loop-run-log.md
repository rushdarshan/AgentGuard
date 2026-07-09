# Loop Run Log — AgentGuard

Append one entry per run. Prune entries older than 30 days.

## Format

```json
{
  "run_id": "2026-06-28T12:00:00Z",
  "pattern": "daily-triage",
  "duration_s": 45,
  "items_found": 4,
  "actions_taken": 1,
  "escalations": 0,
  "tokens_estimate": 52000,
  "outcome": "report-only | fix-proposed | escalated | no-op"
}
```

## Recent Runs

| Date | Pattern | Items | Actions | Tokens | Outcome |
|------|---------|-------|---------|--------|---------|
| 2026-06-28 | initiation | — | scaffold | — | loop-init scaffold complete |
| 2026-07-09 | daily-triage | 0 | 1 | 0 | 0 | report-only |
