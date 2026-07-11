# AgentGuard — 3-Minute Pitch

---

## 0:00 – Problem (20s)

"AI agents are getting deployed into production without security testing. Prompt injection, data leaks, jailbreaks — these aren't theoretical. They're shipping every day. The existing tools — PyRIT, garak — are research frameworks. They don't fit into a CI pipeline and they can't test in languages like Hindi or Hinglish, which is where most real-world code-switched attacks happen."

---

## 0:20 – Solution / Demo (90s)

"AgentGuard fixes this. It's an adversarial testing harness with three things no other tool has.

**One — Hinglish attacks.** [open agent list, click demo agent, show attack running]
We integrate with Sarvam AI's speech-to-text and Indic language models. We test your agent in Hindi, Bengali, Tamil, Telugu. Here's a Hinglish jailbreak that leaks user data — our proxy catches it.

**Two — the runtime proxy.** [show proxy mode]
No code changes to your agent. Run `agentguard proxy`, point your traffic through it, and every request gets judged in real time by a multi-model consensus — GPT-4o-mini and Claude Haiku voting together with Cohen's kappa.

**Three — cascade graphs.** [click on a completed run, show cascade graph]
This is a force-directed Neo4j graph of attack propagation. Not just which attacks fail, but which failures trigger others. Critical cascades get flagged. You fix the root cause, not the symptom.

**And it gates deploys.** The pre-push hook blocks any commit where the agent readiness score drops below your threshold."

---

## 1:50 – Technical differentiator (30s)

"Three technical bets: multi-model judge with swap-position double-judging eliminates single-judge bias. The Wilson confidence interval on every pass rate means you know when a change is statistically significant. And the Sarvam integration — we're the only red-teaming tool that can generate adversarial prompts in four Indic languages from speech input."

---

## 2:20 – Social proof / Sponsors (20s)

"We built this for [sponsor names]. Sarvam AI — their Indic models power our voice attack surface. Neo4j — their AuraDB runs our cascade graphs. This is the sponsor tech working together in a real product."

---

## 2:40 – Close / CTA (20s)

"AgentGuard is open source, MIT licensed. Live demo at agentguard-j5ny.onrender.com. The repo has a 10-second quick start. If you're shipping an AI agent without running it through AgentGuard first — your users will find the vulnerabilities for you."

---

## Tips
- Speak at 70% of normal pace. Nerves speed you up.
- Point at the screen during the demo. Use click → gesture → talk rhythm.
- The cascade graph is your visual climax. Pause after it loads. Let it animate.
- If the live demo breaks, have a Loom video ready as backup.
- End with eye contact and silence. Don't fill the space with "um" or "so yeah."
