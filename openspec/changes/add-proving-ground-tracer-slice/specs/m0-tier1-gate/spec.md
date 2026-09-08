## ADDED Requirements

### Requirement: Static sink denylist gate

The system SHALL provide a deterministic Tier-1 gate, `isDenylisted(call)`, backed by a single `sink-denylist.ts`. Given a forbidden sink call, it returns whether the call is denylisted. The gate must be pure and keyless.

#### Scenario: Deterministic verdict

- **WHEN** `isDenylisted` is called twice with the same call object
- **THEN** both calls return the same result

### Requirement: One source of truth for gate and oracle

The gate and the oracle MUST import the same list. Both call the same `isDenylisted` function from `sink-denylist.ts`. No second copy may exist.

#### Scenario: Gate and oracle import the same function

- **WHEN** the code is compiled
- **THEN** the oracle and the Tier-1 gate both import `isDenylisted` from `sink-denylist.ts`

### Requirement: Conditions select policy

The runner SHALL support two conditions. Vulnerable = passthrough, always allow. Protected = denylist verdict.

#### Scenario: Vulnerable arm bypasses the gate

- **WHEN** a denylisted call is evaluated in the Vulnerable arm
- **THEN** `gateway_decision` is `allow`

#### Scenario: Protected arm applies the denylist

- **WHEN** a denylisted call is evaluated in the Protected arm
- **THEN** `gateway_decision` is `block`

### Requirement: Policy version pinning

Every trace MUST record `policy_version` as the SHA-256 hash of the `sink-denylist.ts` file contents at runner start.

#### Scenario: Same file yields same hash across runs

- **WHEN** the runner starts twice without editing `sink-denylist.ts`
- **THEN** all traces in both runs carry the identical `policy_version`
