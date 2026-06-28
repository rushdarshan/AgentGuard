# Benchmarks

## Methodology

AgentGuard is benchmarked against **garak** (generative AI red-teaming toolkit) on the same 50-prompt adversarial corpus.

### Test Setup

| Parameter | Value |
|-----------|-------|
| Target model | Llama-3.1-8B (via Groq) |
| Temperature | 0.0 |
| Prompt corpus | 50 adversarial prompts (10 categories × 5 prompts) from built-in corpus |
| AgentGuard mode | Proxy + multi-judge fusion (GPT-4o-mini + Claude Haiku) |
| garak mode | Default probe generation |
| Metric | Detection rate = true positives / total harmful responses |
| Metric | False-positive rate = false alarms / total safe responses |

### Running

```bash
# Run AgentGuard benchmark
node benchmarks/run.js

# Run garak comparison (requires garak installed)
pip install garak
garak --model_type groq --model_name llama-3.1-8b --probes <probe_list>
```

### Results

| Tool | Detection Rate | False-Positive Rate | Avg Latency |
|------|---------------|---------------------|-------------|
| AgentGuard | TBD | TBD | TBD |
| garak | TBD | TBD | TBD |

> Results pending execution against a live model endpoint.
