## Goal
- Ship HACKHAZARDS '26 submission with Neo4j graph visualization, Sarvam multilingual attacks, real-agent red-teaming demo, and distinctive frontend design.
- Deploy on Render.

## Progress
### Done
- Git repo initialized, pushed to `github.com/rushdarshan/AgentGuard.git`
- `.gitignore` excludes `.env`, `dist`, `node_modules`, `__pycache__`, `*.pyc`
- `render.yaml` exists with web service config (all env vars `sync: false` — set in dashboard)

### Pending for Render deploy
- Connect GitHub repo in Render dashboard
- Set env vars: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `GROQ_API_KEY`, `SARVAM_API_KEY`, `LLM_API_KEY`
- Deploy
