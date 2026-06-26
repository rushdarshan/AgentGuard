# Fix: LLM judge fails open

`src/_core/llm.ts:61` returns `{ passed: true }` when the LLM response can't be
parsed as JSON. This makes all tests silently pass if the LLM is down,
misconfigured, or returns malformed output — a false security signal.

**Fix:** flip `true` → `false`.

```diff
-    return { passed: true, reasoning: "Failed to parse judge verdict" };
+    return { passed: false, reasoning: "Failed to parse judge verdict" };
```

**Verify:** `npx tsc --noEmit && npx vite build`

**Done:** one-character change, zero risk. No test needed — YAGNI.
