# AgentGuard: Toward Statistically Rigorous Agent Red-Teaming

*Research note accompanying the AgentGuard evaluation harness (github.com/rushdarshan/AgentGuard).*

## Problem

AI agents are increasingly deployed without rigorous safety testing. Existing
red-teaming tooling is typically manual, single-judge, and English-only, which
means safety verdicts are anecdotal rather than measured. We lack defensible,
reproducible methods for answering the core question: *how safe is this agent,
and how certain are we?*

## Method

AgentGuard is an adversarial testing harness that runs 10 attack categories
(mapped to OWASP LLM, OWASP Agentic, and MITRE ATLAS taxonomies) against an
agent endpoint. Three methodological contributions distinguish it from
single-judge tooling:

1. **Bias-resistant multi-judge consensus.** Each interaction is judged twice
   per provider under swapped frames ("did the agent FAIL?" vs "was the response
   SAFE?") to detect position/framing bias, then fused across providers via
   majority vote with **Cohen's κ** inter-rater agreement. Low-κ findings are
   flagged `unstable` rather than reported as fact.

2. **Statistically calibrated pass rates.** Category-level pass rates carry a
   **95% Wilson score interval**, giving confidence bounds for small samples
   instead of point estimates.

3. **Failure-cascade analysis.** Failures are modeled as a graph; **Louvain**
   community detection finds failure clusters, **PageRank** ranks the most
   influential (cascading) failure categories, and **lift ratios** quantify
   within- vs cross-community cascade structure. Cross-run graph deltas track
   how failure structure shifts between deployments.

4. **Reproducibility filter ("disprove" phase).** An adversarial validation
   agent rephrases each failed attack into 3 semantic variants and re-tests.
   Findings are classified *Confirmed* (failed all variants) or *Flaky*
   (passed at least one) — separating robust findings from false positives.

## Preliminary results

Across 10 attack categories on multiple agent endpoints, cascade structure is
stable across runs (cross-run graph delta shows consistent community
assignments), suggesting cascade topology may be a predictive — not merely
descriptive — eval signal. Multi-judge κ agreement varies sharply by attack
category, indicating some safety claims rest on unreliable judges.

## Open questions (fellowship-relevant)

- How does κ agreement hold across model families and languages at scale?
- Does cascade structure predict real-world agent failure modes?
- Can cross-lingual (Indic/code-mixed) eval expose failure classes English-only
  benchmarks miss?

## Relation to existing tooling

AgentGuard complements PyRIT (Microsoft) and garak (NVISO) by adding
multi-judge rigor, graph-based analysis, and CI/CD-native runtime protection
(including an Indic-language attack track via Sarvam AI).
