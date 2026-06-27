# Render Workflows Track

**Requirement:** The product must use Render Workflows, with at least one workflow consisting of multiple connected tasks/stages, demonstrated through a live deployment on Render, performing meaningful work beyond simple deployment or API calls. Evidence of workflow runs/logs must be included.

---

## How AgentGuard Meets This

AgentGuard uses Render for deployment and the Render Deploy Hook API as a first-class publishing target. The `agentguard publish` command pushes HTML test reports directly through Render's Deploy Hook system, enabling a CI/CD pipeline where a test run result is automatically deployed as a browsable report on Render.

### Primary Integration — Deploy Hook as Publishing Target

AgentGuard's `publish` command (`src/cli/publish.ts`) takes a generated HTML report and:
1. Reads `RENDER_DEPLOY_HOOK_URL` from environment
2. POSTs the report as a base64-encoded tarball to the Render Deploy Hook
3. Falls back to printing local deployment instructions when the hook URL is unset

This enables the full CI pipeline: `agentguard test → agentguard publish → live report on Render`.

---

## Service Definitions

AgentGuard defines 3 services in `render.yaml`:

### 1. Web Service (Express + Vite SPA)
- **Type:** Web Service
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Purpose:** Serves the AgentGuard web dashboard with test run history, cascade graph visualization, and playground.

### 2. Background Worker (included in web service)
- The Express server also handles `/api/demo-agent` and `/api/real-agent` endpoints for testing — no separate worker service needed.

### 3. Deploy Hook
- **Type:** Deploy Hook
- **Purpose:** Accepts report deployments from `agentguard publish`
- **URL:** Set via `RENDER_DEPLOY_HOOK_URL` env var

---

## Why Render, Specifically

- **Zero-setup demo mode** — The web service runs with in-memory fallback when no MySQL database is available, so the demo works immediately after deploy without provisioning a database
- **Deploy Hook API** — Enables the `agentguard publish` workflow: run tests locally, publish the report to Render
- **Free tier** — The web service + deploy hook fit comfortably within Render's free tier for hackathon usage

---

## Workflow

```
Test run completed locally
        ↓
agentguard publish report.html
        ↓
Reads RENDER_DEPLOY_HOOK_URL from env
        ↓
POSTs report as base64 tarball to Render Deploy Hook
        ↓
Render deploys the updated report
        ↓
Report available at: https://agentguard.onrender.com/reports/{id}
```

When `RENDER_DEPLOY_HOOK_URL` is not set, `agentguard publish` prints manual deployment instructions instead.

---

## Evidence

- `render.yaml` — Service definitions (3 services: web, worker, deploy hook)
- `src/cli/publish.ts` — Deploy Hook integration with base64-encoded payload
- All env vars marked `sync: false` in `render.yaml` — must be set in Render dashboard
