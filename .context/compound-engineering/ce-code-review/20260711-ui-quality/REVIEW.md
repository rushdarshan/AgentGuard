# Code Review — UI Quality Improvements

**Date:** 2026-07-11
**Branch:** fix/project-review-quality
**Mode:** headless
**Plan:** docs/plans/2026-07-11-005-feat-ui-quality-improvements-plan.md

## Scope

28 files changed, 1247 insertions, 407 deletions. Focus on 4 target files:
- src/pages/Dashboard.tsx
- src/pages/AgentsList.tsx
- src/pages/VoiceDemo.tsx
- src/pages/TestRunHistory.tsx

## Findings

### P1 — High

| # | File | Issue | Autofix | Status |
|---|------|-------|---------|--------|
| 1 | Dashboard.tsx:36 | useGSAP runs before data refs are populated — animations dead | gated_auto | FIXED |
| 2 | AgentsList.tsx:67 | Unhandled promise rejection from deleteAgent.mutateAsync | safe_auto | FIXED |

### P2 — Moderate

| # | File | Issue | Autofix | Status |
|---|------|-------|---------|--------|
| 3 | VoiceDemo.tsx:138 | Stale closure: inputLang missing from doPlayTTS deps | safe_auto | FIXED |
| 4 | AgentsList.tsx:64 | useEffect with confirm() — double-fire in StrictMode | manual | Pre-existing, not in scope |
| 5 | AgentsList.tsx:71 | Missing deleteAgent in useEffect deps | advisory | Pre-existing |
| 6 | TestRunHistory.tsx:43 | Non-null assertions on nullable state | advisory | Pre-existing |
| 7 | VoiceDemo.tsx:159 | Inline style tag with @keyframes | gated_auto | Pre-existing pattern |

### P3 — Low

| # | File | Issue | Autofix | Status |
|---|------|-------|---------|--------|
| 8 | Dashboard.tsx:118 | rounded-full violates no-border-radius rule | safe_auto | FIXED |
| 9 | AgentsList.tsx:35 | rounded-full in StatusDot | safe_auto | FIXED |
| 10 | Dashboard.tsx:6 | Unused Share1Icon import | safe_auto | FIXED |
| 11 | Dashboard.tsx:188 | Redundant (run as any) casts | safe_auto | FIXED |
| 12 | All 4 files | Color palette violations (#E61919, #4AF626, etc.) | safe_auto | FIXED |
| 13 | VoiceDemo.tsx:241 | Colored background on success badge | safe_auto | FIXED |

## Applied Fixes

1. **GSAP dependencies** — Added `dependencies: [agentsLoading, runsLoading]` to useGSAP options
2. **Promise rejection** — Added `.catch()` to deleteAgent.mutateAsync chain
3. **Stale closure** — Added `inputLang` to doPlayTTS useCallback deps
4. **rounded-full** — Removed from Dashboard status dot and AgentsList StatusDot
5. **Unused import** — Removed Share1Icon from Dashboard
6. **Redundant casts** — Removed (run as any) from Dashboard
7. **Color palette** — Corrected all off-palette hex values in 4 target files:
   - #E61919 → #D82C20, #4AF626 → #22C55E, #8A8A8A → #808080
   - #121212 → #111111, #EAEAEA → #F5F5F5, #C4A535 → #F59E0B

## Residual Actionable Work

- **Manual:** Move inline <style> tag in VoiceDemo.tsx to CSS module (P2)
- **Advisory:** Add deleteAgent to useEffect deps in AgentsList.tsx (P2)
- **Advisory:** Remove non-null assertions in TestRunHistory.tsx (P2)

## Requirements Verification

| Req | Description | Status |
|-----|-------------|--------|
| R1 | Dashboard communicates system health at a glance | MET |
| R2 | Dashboard stats feel alive | MET |
| R3 | Agent cards feel interactive with operational status | MET |
| R4 | Voice page communicates pipeline sophistication | MET |
| R5 | Logs are scannable | MET |

## Verdict

**PASS** — All P1 issues fixed. Safe_auto fixes applied. Pre-existing issues documented but out of scope.
