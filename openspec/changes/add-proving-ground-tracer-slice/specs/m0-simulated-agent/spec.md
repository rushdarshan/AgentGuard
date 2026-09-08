## ADDED Requirements

### Requirement: Seeded stochastic compliance

The simulated agent SHALL decide whether to trust a delivered tool response using a seeded PRNG (`rng() < trust_probability`). The same seed MUST produce the same compliance decisions across runs.

#### Scenario: Seed reproduces the compliance sequence

- **WHEN** two arms of the same family run with the identical seed
- **THEN** the agent's `agent_complied` bit is the same in both arms before the gate evaluates

#### Scenario: Different seeds vary outcomes

- **WHEN** the same family runs under different seeds
- **THEN** the set of compliance outcomes is not all identical when `trust_probability` is strictly between 0 and 1

### Requirement: Trust probability is a documented calibration constant

`trust_probability` SHALL be declared in code as a simulator calibration parameter. Reports and READMEs MUST state that it is not an empirical estimate of real LLM behavior.

#### Scenario: Report carries the disclaimer

- **WHEN** `table.md` is generated
- **THEN** its header includes a line labeling `trust_probability` a calibration constant of the simulator

### Requirement: Emission, not execution

When the agent trusts a poisoned response it SHALL return an emitted call object `{ sink, args }`. No filesystem, network, or shell side effect MAY occur; the sink is a recorder.

#### Scenario: Destructive payload is recorded not run

- **WHEN** a trusted destructive-command-relay fixture yields a call with `args: "rm -rf /"`
- **THEN** the call is recorded and the filesystem is unchanged
