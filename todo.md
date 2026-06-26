# AgentGuard — Build Todo

## Architecture & Setup
- [ ] Database schema: agents, test_suites, test_runs, test_results, attack_corpus
- [ ] Backend core: tRPC routers for agents, tests, runs, results
- [ ] LLM integration: dynamic attack generation from agent descriptions
- [ ] Real-time streaming: WebSocket or SSE for test execution progress
- [ ] Design system: color palette, typography, spacing tokens (technical, premium aesthetic)

## Landing Page (Feature 1)
- [ ] Hero section with value proposition and visual hook
- [ ] Feature highlights (5 key benefits)
- [ ] Live demo teaser or animated preview
- [ ] Call-to-action button (Get Started)
- [ ] Footer with links

## Dashboard (Feature 2)
- [ ] Agent overview cards: count, status, recent activity
- [ ] Recent test runs summary with pass/fail indicators
- [ ] Trend sparklines for reliability over time
- [ ] Aggregate reliability score display
- [ ] Quick-access links to manage agents and run tests

## Agent Endpoint Management (Feature 3)
- [ ] List view: all agents with name, URL, status, last test date
- [ ] Add agent form: name, URL, auth headers, description
- [ ] Edit agent form: update all fields
- [ ] Delete agent with confirmation
- [ ] Test endpoint connectivity before save
- [ ] Secure storage of auth headers (encrypted)

## Adversarial Test Suite Builder (Feature 4)
- [ ] Attack category selector: Prompt Injection, Context Overflow, Logic Collapse, Jailbreak, Hallucination
- [ ] Intensity slider (low/medium/high) per category
- [ ] Test count input per category
- [ ] Built-in attack corpus display
- [ ] Preview of attack samples
- [ ] Save test suite configuration

## LLM-Powered Dynamic Attack Generation (Feature 5)
- [ ] Call LLM to generate novel prompts based on agent description
- [ ] Tailor attacks to agent's stated purpose
- [ ] Expand corpus with AI-generated vectors per run
- [ ] Cache generated attacks for consistency
- [ ] Fallback to built-in corpus if LLM fails

## Test Run Execution Engine (Feature 6)
- [ ] Submit test job against registered agent endpoint
- [ ] Real-time streaming progress: test count, current test, pass/fail
- [ ] Live pass/fail indicators per attack category
- [ ] Per-test response previews (truncated for safety)
- [ ] Error handling and timeout management
- [ ] Cancel running test job

## Reliability Scorecard (Feature 7)
- [ ] Per-run breakdown: pass/fail counts per attack category
- [ ] Numeric reliability score (0–100)
- [ ] Severity badges (critical, high, medium, low)
- [ ] Visual score indicator (gauge or progress bar)
- [ ] Exportable summary (JSON or PDF)
- [ ] Comparison with previous runs

## Failure-Cascade Graph Visualization (Feature 8)
- [ ] Force-directed graph layout (d3.js or similar)
- [ ] Nodes: test failures with labels
- [ ] Edges: cascade relationships (which failure triggered which)
- [ ] Interactive zoom and pan
- [ ] Node detail tooltips on hover
- [ ] Filter by severity or category
- [ ] Export graph as image

## Test Run History (Feature 9)
- [ ] Paginated list of past runs per agent
- [ ] Filterable by date range, status (pass/fail/partial), score range
- [ ] Sort by date, score, or category
- [ ] Run detail view with full scorecard and graph
- [ ] Diff comparison between two runs
- [ ] Download run results (JSON/CSV)

## User Authentication & Protected Routes (Feature 10)
- [ ] OAuth login via Manus
- [ ] Protected routes: dashboard, agents, tests, runs, history
- [ ] User isolation: each user sees only their own data
- [ ] Logout functionality
- [ ] Session management and token refresh
- [ ] Role-based access (optional: admin panel)

## Design & Polish
- [ ] Color palette: technical, premium, developer-focused (dark or light theme)
- [ ] Typography: clear hierarchy, readable fonts
- [ ] Spacing and layout: consistent grid, breathing room
- [ ] Icons: lucide-react for consistency
- [ ] Loading states: spinners, skeletons, progress indicators
- [ ] Error states: clear error messages, retry options
- [ ] Responsive design: mobile, tablet, desktop
- [ ] Accessibility: WCAG compliance, keyboard navigation
- [ ] Micro-interactions: smooth transitions, button feedback
- [ ] Empty states: helpful guidance when no data

## Testing & Quality
- [ ] Unit tests: backend routers (vitest)
- [ ] Integration tests: agent CRUD, test execution flow
- [ ] E2E smoke tests: landing page, login, dashboard
- [ ] LLM integration tests: mock LLM responses
- [ ] Real-time streaming tests: WebSocket/SSE flow
- [ ] Performance: load testing, query optimization
- [ ] Security: auth header encryption, input validation, rate limiting

## Deployment & Finalization
- [ ] Environment variables: LLM API key, database URL, OAuth config
- [ ] Build optimization: code splitting, lazy loading
- [ ] Error tracking and logging
- [ ] Analytics integration (optional)
- [ ] Documentation: README, API docs, deployment guide
- [ ] Final checkpoint and publish
