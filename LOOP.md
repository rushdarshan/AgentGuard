# Loop Configuration — AgentGuard

## Active Loops

| Pattern | Cadence | Status | Command |
|---------|---------|--------|---------|
| Daily Triage | 1d | L1 report-only | `/loop 1d Run $loop-triage` |
| PR Babysitter | 5–15m after push | L1 watch | auto via CI |
| Changelog Drafter | on tag | L1 draft | auto via CI |

## Human Gates

- No auto-fix until L2 checklist complete
- Production data / Render deploy: human review required
- README / docs changes: auto-merge after 1 approval

## Worktrees

- Use `git worktree` when spawning implementer sub-agents (L2+)
- One worktree per fix attempt; discard after verifier REJECT

## Connectors (MCP)

- GitHub MCP for PR/issue reads (read-only in L1)
- No Ops/GCP MCP in L1

## Budget

- Max sub-agent spawns per run: 0 (L1), 2 (L2)
- Token ceiling: 150k/day for triage
- Review STATE.md daily at 09:00

## Links

- Pattern: daily-triage
- Checklist: docs/loop-design-checklist.md
- Safety: SECURITY.md
- Audit: `npx @cobusgreyling/loop-audit . --suggest`
