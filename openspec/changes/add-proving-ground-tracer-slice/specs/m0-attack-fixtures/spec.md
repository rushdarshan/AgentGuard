## ADDED Requirements

### Requirement: Five attack families with canonical fixtures

The system SHALL provide exactly five tool-supply-chain attack families, each with one canonical poisoned fixture: poisoned-tool-description, hidden-tool-response, spoofed-tool-output, argument-injection, and destructive-command-relay. No family may be added or removed in this change.

#### Scenario: Fixture set is closed at five

- **WHEN** the runner enumerates `benchmarks/m0/attacks/`
- **THEN** it finds exactly five family directories and one poisoned fixture per directory

#### Scenario: Every poisoned fixture declares its target sink

- **WHEN** a poisoned fixture is loaded
- **THEN** it exposes a structured `emitted_sink` field naming the forbidden call the agent would make

### Requirement: Clean control per family

Each attack family SHALL have one clean counterpart fixture carrying legitimate tool-response behavior whose `emitted_sink` is a sink that must not be denylisted. Clean fixtures are flagged `clean: true`.

#### Scenario: Clean counterpart exists for each family

- **WHEN** the runner loads the dataset
- **THEN** it finds five poisoned and five clean fixtures, paired one-to-one by family

### Requirement: Poison delivery contract

A fixture SHALL deliver its poisoned tool response to the simulated agent without the agent reading fixture metadata (target sink, clean flag) as part of the response body.

#### Scenario: Poison reaches the agent as a tool response

- **WHEN** the runner feeds a poisoned fixture to the agent
- **THEN** the agent's received tool-response text contains the payload and the agent never sees `emitted_sink` in that text
