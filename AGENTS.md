# AGENTS.md

## Test commands
npm test
npm run lint

## Loop conventions
- Report-only week one (L1) before enabling auto-fix (L2)
- See LOOP.md for cadence and human gates

## Writing style

Apply these rules from [agent-style](https://github.com/yzhao062/agent-style):

**Claims** — Calibrate verbs to evidence. "Suggests" not "proves" for experimental results. No "best" without comparison against strongest alternative. No reflexive weasels ("it might be worth considering" → "we should do X"). No overclaim for what is seeded or illustrative.

**Voice** — Active unless agent is unknown or irrelevant. "We ran 9 attack categories" not "9 attack categories were run".

**Word choice** — Concrete over abstract. "Checkout p95 rose 120ms→450ms" not "performance issues". No "leverage/utilize/methodology". No "in order to" (→"to"), "due to the fact that" (→"because"), "it is important to note that" (→delete).

**Structure** — Split sentences over 30 words. Vary length (8/18/22/14/30). Bullets only for parallel enumerations, not fragmented prose. No em dashes as casual punctuation. Don't start consecutive sentences with same word.

**LLM tells** — No paragraph-level summary closers ("In summary...", "Overall..."). No "additionally/furthermore/moreover" unless the logical move needs flagging. Use consistent terms throughout — do not alternate synonyms for the same concept.
