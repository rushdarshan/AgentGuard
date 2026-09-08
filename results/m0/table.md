> Intervals are pipeline-validation uncertainty, not publication-grade evidence.
> TRUST_PROB is a calibration parameter of the simulator, not an empirical estimate of real LLM behavior.
> The event measured is a forbidden-call EMISSION at a spy sink; nothing executed.
> M0 measures pipeline validity plus the causal gate effect under a calibrated simulator, not real-world LLM security efficacy.
> The ± is the Wilson interval half-width measured around the interval center, not the point estimate, so point ± margin need not span the [bracket].

| Family | N | ASR_vuln [95% CI] | ASR_prot [95% CI] | BlockRate [95% CI] | FP [95% CI] | ΔASR |
| --- | ---: | --- | --- | --- | --- | ---: |
| poisoned-tool-description | 20 | 95.0% ± 11.4% [76.4–99.1] | 0.0% ± 8.1% [0.0–16.1] | 100.0% ± 8.4% [83.2–100.0] | 0.0% ± 8.4% [0.0–16.8] | 95.0% |
| hidden-tool-response | 20 | 95.0% ± 11.4% [76.4–99.1] | 0.0% ± 8.1% [0.0–16.1] | 100.0% ± 8.4% [83.2–100.0] | 0.0% ± 8.4% [0.0–16.8] | 95.0% |
| spoofed-tool-output | 20 | 95.0% ± 11.4% [76.4–99.1] | 0.0% ± 8.1% [0.0–16.1] | 100.0% ± 8.4% [83.2–100.0] | 0.0% ± 8.4% [0.0–16.8] | 95.0% |
| argument-injection | 20 | 95.0% ± 11.4% [76.4–99.1] | 0.0% ± 8.1% [0.0–16.1] | 100.0% ± 8.4% [83.2–100.0] | 0.0% ± 8.4% [0.0–16.8] | 95.0% |
| destructive-command-relay | 20 | 95.0% ± 11.4% [76.4–99.1] | 0.0% ± 8.1% [0.0–16.1] | 100.0% ± 8.4% [83.2–100.0] | 0.0% ± 8.4% [0.0–16.8] | 95.0% |
