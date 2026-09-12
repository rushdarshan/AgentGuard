// Case identity is sourceCaseId + arm + seed + scenario. attemptId is separate
// provenance metadata (which run produced this record), never part of identity,
// so regeneration of the same case overwrites the same bundle instead of
// colliding with a "first bundle wins" rule.

export interface CaseIdentityFields {
  sourceCaseId: string;
  arm: string; // e.g. "vulnerable" | "protected"
  seed: number;
  scenario: string; // e.g. attack family id
}

export class CaseIdentity {
  readonly fields: CaseIdentityFields;
  readonly attemptId: string | null;

  constructor(fields: CaseIdentityFields, attemptId: string | null = null) {
    this.fields = { ...fields };
    this.attemptId = attemptId;
    for (const key of ["sourceCaseId", "arm", "scenario"] as const) {
      if (!fields[key] || typeof fields[key] !== "string") {
        throw new Error(`identity.${key} is required and must be a non-empty string`);
      }
    }
    if (!Number.isInteger(fields.seed)) {
      throw new Error(`identity.seed must be an integer, got ${String(fields.seed)}`);
    }
  }

  get key(): string {
    const { sourceCaseId, arm, seed, scenario } = this.fields;
    return `${sourceCaseId}__${arm}__${seed}__${scenario}`;
  }

  equals(other: CaseIdentity): boolean {
    return this.key === other.key;
  }
}
