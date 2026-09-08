## 1. Scaffold

- [x] 1.1 Create `benchmarks/m0/` tree: `attacks/`, `tracer/`, plus `types.ts`, `sink-denylist.ts`, `runner.ts`, `oracle.ts`, `report.ts`
- [x] 1.2 Add `mulberry32(seed)` PRNG and the locked trace interface to `types.ts`
- [x] 1.3 Author `sink-denylist.ts`: `SINK_DENYLIST`, `isDenylisted(call)`, and `policyVersion()` (sha256 of file)

## 2. Fixtures

- [x] 2.1 Write the five poisoned fixtures, one per family dir, each declaring a structured `emitted_sink`
- [x] 2.2 Write the five clean counterparts (`clean: true`, non-denylisted sink)
- [x] 2.3 Enforce the closed set (exactly 5 poisoned + 5 clean, paired by family)

## 3. Agent + Gate

- [x] 3.1 Implement `tracer/simulated-agent.ts`: `rng() < trust_probability` compliance, returns `{ sink, args }` on trust
- [x] 3.2 Implement the spy sink recorder (no fs/network/shell side effects)
- [x] 3.3 Wire `trust_probability` as a labeled calibration constant

## 4. Oracle

- [x] 4.1 Implement `oracle.ts`: success = poisoned-delivered AND emitted-denylisted AND not-blocked, importing the gate's `isDenylisted`
- [x] 4.2 Record `forbidden_sink_emitted` per the three-condition rule; blocked calls logged as suppressed

## 5. Runner

- [x] 5.1 Build the paired matrix: 5 families x 20 Vulnerable + 20 Protected (shared seeds) + 20 Protected clean = 300 runs
- [x] 5.2 Assert vulnerable/protected traces carry identical `seed` and `agent_complied` before writing
- [x] 5.3 Stamp each trace with `policy_version`, `git_sha`, `node_version`
- [x] 5.4 Write `results/m0/traces.jsonl`

## 6. Report + Stats

- [x] 6.1 Implement `report.ts`: `ASR`, Wilson CIs via `_core/stats.wilsonCI`/`formatCI`, Conditional Block Rate (vulnerable denominator), FP rate, ΔASR
- [x] 6.2 Render `table.md` with the pipeline-validation-uncertainty label and calibration disclaimer; no latency column
- [x] 6.3 Add `npm run bench:m0` invoking the runner via tsx

## 7. Tests (vitest)

- [x] 7.1 Five `oracle.<family>.test.ts` asserting the success rule on a known seed
- [x] 7.2 `clean-controls.test.ts` asserting zero forbidden emissions and bounded FP
- [x] 7.3 `runner.test.ts` asserting exactly 300 traces and seed-pairing invariant
- [x] 7.4 `m0-table.test.ts` regenerating the table from committed traces and failing on drift
- [x] 7.5 `sink-safety.test.ts` proving an `rm -rf` trace mutates nothing on disk

## 8. Verify

- [x] 8.1 Run `npm run bench:m0` and confirm `results/m0/` outputs
- [x] 8.2 `npm test` clean (9 files / 22 tests green). `npm run lint` not runnable: eslint is absent from package.json + lockfile (pre-existing repo condition), so no lint gate was faked
- [x] 8.3 Confirm `benchmarks/run.js` and `_core/stats.ts` are byte-identical to before
