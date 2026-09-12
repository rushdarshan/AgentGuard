# Ideation: Mitacs GRI 2027 Knockout Portfolio Projects

- **Date:** 2026-09-07
- **Candidate:** Darshan K (B.Tech AI & DS, CIT Chennai, CGPA 7.8/10)
- **Focus:** Maximum Selection Advantage for Mitacs GRI 2027
- **Execution Mode:** AI-Agent Automated Engineering Fleet
- **Output:** Ranked Candidate Portfolio Artifacts

---

## 1. Grounding Context
At a **7.8 / 10 CGPA**, Darshan K cannot win on grade-based filtering against 9.8 CGPA applicants. To win an undisputed match at the top Canadian laboratories, the portfolio project must:
1. **Directly Solve Lab Bottlenecks:** Target the exact open problems stated in the top Mitacs 2027 project descriptions (UQAC Project 53670, ÉTS Project 54476, Laval Project 54441).
2. **Leverage Existing Proven Stack:** Build upon *AgentGuard* (AI security & Neo4j failure graphs), *AgentRouter* (Java 17, circuit breakers, P99 metrics), *CareNexa* (LangGraph multi-agent routing), and his open-source PR on *Meshery Model Context Protocol (MCP) Server*.
3. **Unbounded Technical Sophistication:** Built using autonomous AI agents to ship production-grade distributed consensus, cryptographic trace replay, and formal graph decomposition.

---

## 2. Topic Axes (Surface Decomposition)
- **Axis 1: Agentic Auditability & Temporal Traceability** (Deterministic replay, causal state graphs, and compliance audit artifacts).
- **Axis 2: Protocol-Level Interoperability & MCP Governance** (Anthropic Model Context Protocol sandboxing, zero-trust permissions, and agent coordination).
- **Axis 3: Edge-Adaptive Multi-Agent Model Routing & Pruning** (ViT attention-head sparsity combined with distributed multi-agent routing under P99 latency budgets).
- **Axis 4: Automated Architecture Modernization & Refactoring** (Graph-driven monolith-to-microservices decomposition with synthetic circuit breakers).

---

## 3. Ranked Ideas (Top Survivors)

### #1 AegisMCP: Auditable Zero-Trust Execution Framework for Model Context Protocol (MCP) Multi-Agent Systems (UNANIMOUS TOP PICK)
- **Axis:** Protocol-Level Interoperability & MCP Governance
- **Confidence:** 98% | **Complexity:** High
- **Targets:** ÉTS Project 54476 (Prof. Ali Ouni) & UQAC Project 53670 (Prof. Elyes Manai)
- **Description:** A zero-trust gateway and deterministic execution sandbox for Anthropic's Model Context Protocol (MCP). AegisMCP intercepts all tool registrations, context exchanges, and tool invocations between autonomous AI agents and local/cloud resources. It enforces runtime permission policies, detects prompt-injection attacks targeting tool parameters, logs cryptographic Merkle-tree execution traces, and isolates tool execution inside micro-containers with P99 latency tracking.
- **Basis:** `direct:` Open-source PR #35 on `meshery-mcp-server` + AgentGuard runtime proxy + AgentRouter Java circuit breakers.
- **Why It Matters:** Directly targets the exact research proposal of Prof. Ali Ouni (ÉTS Montréal, Project ID 54476: "Agentic AI and Model Context Protocol for SE") and Prof. Elyes Manai (UQAC, Project ID 53670: "Deterministic Audit Trails for Autonomous Systems").
- **Trade-offs:** Introduces 1.5–3.5ms gateway overhead per tool invocation; requires Redis schema caching.

### #2 TraceGuard: Deterministic Causal Replay & Audit DAG for Multi-Agent LLM Architectures
- **Axis:** Agentic Auditability & Temporal Traceability
- **Confidence:** 95% | **Complexity:** Medium-High
- **Targets:** UQAC Projects 53670 (Prof. Elyes Manai) & 53134 (Prof. Darine Ameyed)
- **Description:** An instrumentation engine for LangGraph that captures full execution DAGs, prompt states, memory injections, and external API responses into a deterministic replay ledger. Performs automated causal failure localization using graph-cut algorithms and re-executes pipelines deterministically using mock state snapshots.
- **Basis:** `direct:` AgentGuard graph-based failure analysis (Neo4j) + CareNexa LangGraph state persistence + pytest regression suites.
- **Why It Matters:** Exact 1-to-1 match for Prof. Elyes Manai (UQAC) and Prof. Darine Ameyed (UQAC).
- **Trade-offs:** Deep execution chains generate large state footprints requiring Parquet/Delta Lake compression.

### #3 NeuroRouter-Edge: P99-Budgeted Dynamic Model Routing & Vision Transformer Compression for Edge Agents
- **Axis:** Edge-Adaptive Multi-Agent Model Routing & Pruning
- **Confidence:** 92% | **Complexity:** High
- **Targets:** ÉTS Project 54117 (Prof. Abdelouahed Gherbi) & Algoma Project 53169 (Prof. Syed Muhammad Danish)
- **Description:** A hybrid edge-cloud router that dynamically cascades inference queries between pruned local models (Vision Transformers compressed via structured attention-head sparsity) and upstream LLMs based on real-time P99 latency budgets and edge hardware telemetry.
- **Basis:** `direct:` Keystone (PyTorch DINOv3 attention-head analysis, 25% sparsity vs 92% accuracy) + AgentRouter (P50/P99 latency tracking, circuit breakers).
- **Why It Matters:** Directly implements the platform described in Prof. Abdelouahed Gherbi's project (ÉTS Project 54117).
- **Trade-offs:** Requires profiling across heterogeneous hardware emulation environments.

### #4 DecompAgent: Graph-Augmented Monolith-to-Microservices Decomposition Engine
- **Axis:** Automated Architecture Modernization & Refactoring
- **Confidence:** 90% | **Complexity:** High
- **Targets:** Université Laval Project 54441 (Prof. Mohamed Aymen Saied)
- **Description:** An autonomous software engineering agent that parses monolithic Java codebases into dependency graphs, applies community detection algorithms to isolate bounded contexts, and automatically synthesizes Spring Boot REST microservices equipped with circuit breakers, health endpoints, and automated regression test suites.
- **Basis:** `direct:` AgentRouter (Java 17, Spring Boot, service graph, schema validation, 35+ tests, 85% coverage) + Neo4j code graph representations.
- **Why It Matters:** Exact alignment with Prof. Mohamed Aymen Saied (Laval Project 54441).
- **Trade-offs:** Java AST parsing of complex reflection/dynamic proxies can produce incomplete dependency edges.

### #5 OntoMemory: Self-Architecting Knowledge-Graph Memory with Temporal Decay for Autonomous Agents
- **Axis:** Agentic Auditability & Temporal Traceability
- **Confidence:** 88% | **Complexity:** Medium
- **Targets:** Dalhousie University Project 51550 (Prof. Ga Wu)
- **Description:** A long-term memory engine for LLM agents that dynamically translates conversation turns and tool outputs into an evolving ontological knowledge graph (Neo4j). It implements mathematical Ebbinghaus forgetting curves to prune stale nodes while reinforcing frequently traversed causal reasoning paths.
- **Basis:** `direct:` CareNexa (multi-agent state management) + AgentGuard (Neo4j graph persistence).
- **Why It Matters:** Direct 1-to-1 match for Prof. Ga Wu's persistent memory project.
- **Trade-offs:** Graph extraction using LLMs can suffer from schema hallucinations without strict Pydantic/tRPC schema gates.

### #6 RedTeam-RAG: Automated Poisoning & Embedding Inversion Security Benchmark
- **Axis:** Protocol-Level Interoperability & MCP Governance
- **Confidence:** 85% | **Complexity:** Medium
- **Targets:** Concordia University of Edmonton Projects 52255 & 52435 (Prof. Md Morshedul Islam)
- **Description:** An automated penetration-testing framework for enterprise RAG pipelines that synthesizes subtle adversarial corpus poisoning attacks, tests embedding inversion vulnerabilities, and benchmarks guardrail detection accuracy with statistical confidence intervals.
- **Basis:** `direct:` AgentGuard (adversarial evaluation across 10 risk categories, confidence intervals, scheduled scans).
- **Why It Matters:** Matches Prof. Md Morshedul Islam's RAG security research.
- **Trade-offs:** Embedding inversion algorithms require GPU training loops; less novel than AegisMCP.

---

## 4. Rejection Summary & Adversarial Filter Record
A total of **28 candidate directions** were generated across 6 divergent frames. The following directions were eliminated through adversarial critique:
- **Generic Coding Copilot:** Rejected — low novelty; commoditized pattern that fails to impress research professors.
- **Autonomous Drone Simulation Controller:** Rejected — domain mismatch; candidate has no ROS/UAV flight dynamics background.
- **Foundation LLM Pre-Training from Scratch:** Rejected — unfeasible compute cost without multi-million dollar GPU clusters.
- **Algorithmic Crypto Trading Bot:** Rejected — domain mismatch; financial market trading is out of scope for Canadian CS systems labs.
- **Interactive Medical Diagnostic Portal:** Rejected — requires clinical trials and HIPAA validation; weaker fit than systems engineering projects.
- **Natural-Language to SQL Wrapper:** Rejected — below ambition floor; trivial utility wrapper without research depth.

---
*Composed 2026-09-07T22:05Z by ce-ideate from candidate profile and Mitacs GRI 2027 catalogue.*