# AgentGuard — CI for Your AI Agents

**Test. Protect. Ship.**

AgentGuard is a CI toolchain for AI agent reliability. It runs adversarial attack tests against your agent endpoints, intercepts malicious outbound API traffic in real time, and gates deploys on an **Agent Readiness Score** (0–100).

## Quick Start

```bash
npm install -g agentguard
agentguard test --url https://my-agent.example.com
```

## Commands

| Command | Description |
|---------|-------------|
| `agentguard test --url <url>` | Run 7-category adversarial attack suite |
| `agentguard proxy --port 9090` | Real-time forward proxy with LLM judge on every request |
| `agentguard pre-push` | Gate git pushes on minimum readiness score |
| `agentguard harden <report.json>` | Generate guardrail config from test results |
| `agentguard validate <report.json>` | Check report against JSON Schema |

## Attack Categories

- **Prompt Injection** — instruction override, context hijacking
- **Context Overflow** — behavior under extreme input/memory pressure
- **Logic Collapse** — reasoning failures, contradictions
- **Jailbreak** — safety guardrail bypass
- **Hallucination** — fabricated responses, data leakage
- **Schema Drift** — tool calling with unexpected input shapes
- **Multi-tenant Context Leak** — cross-user data extraction

## Proxy Mode

Set `HTTP_PROXY=http://127.0.0.1:9090` in your agent's environment:

```bash
agentguard proxy --allowlist api.openai.com,api.stripe.com
```

Every outbound request is judged with swap-position double-judging. Unknown domains are blocked. HTTPS domains are tunneled and logged.

## GitHub Action

```yaml
- name: AgentGuard
  uses: agentguard/agentguard@v1
  with:
    url: ${{ secrets.AGENT_URL }}
    threshold: 80
```

Posts PR comments with score and hardening config.

## Pre-Push Gate

```bash
agentguard pre-push --install   # one-time setup
agentguard pre-push --url <url> # block push if score < 80
```

## How It Works

Every attack is double-judged (swap-position to eliminate framing bias) across multiple LLM providers. Consensus voting with Cohen's κ detects unreliable judges. A "Disprove" phase runs an adversarial agent against every finding to eliminate false positives.

## HACKHAZARDS '26

Built for [HACKHAZARDS '26](https://hackhazards.geekybase.com/). 7 prize tracks: Neo4j ($1000), Expo, Sarvam AI, Render.

License: MIT
