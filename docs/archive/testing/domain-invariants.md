# Domain Invariants

This document maps the highest-value business invariants to the domain-layer test suites that enforce them.

## Covered invariants

### Assignments
- `ProjectAssignment` is person-to-project only
- allocation percent must remain between 0 and 100
- workflow transitions are explicit and validated
- lifecycle mutations reject stale concurrent writes instead of silently overwriting state
- work evidence comparison must not mutate the assignment aggregate

Coverage:
- `test/domain/assignments/project-assignment-invariants.spec.ts`

### Work Evidence
- work evidence is stored independently from authoritative staffing
- evidence preserves explicit source and traceability

Coverage:
- `test/domain/work-evidence/work-evidence-invariants.spec.ts`

### Project Registry
- internal `Project` identity is separate from `ProjectExternalLink`
- external metadata changes do not replace internal project identity
- duplicate external link keys within the same external system are rejected

Coverage:
- `test/domain/project-registry/project-identity-invariants.spec.ts`

### Organization
- one primary solid-line manager can be resolved for an effective period
- dotted-line relationships may coexist with the solid-line manager
- future-dated reporting changes do not overwrite current truth
- invalid effective date ranges are rejected

Coverage:
- `test/domain/organization/reporting-line-invariants.spec.ts`

### Metadata
- dictionary entries can be enabled and disabled without embedding business constants
- custom fields can target only valid internal entity types
- validation rules attach to custom-field definitions as metadata, not inline UI logic

Coverage:
- `test/domain/metadata/metadata-invariants.spec.ts`

## Helper conventions
Shared domain assertions live under `test/helpers`.
- `expectDomainError(...)` keeps error assertions explicit
- `expectSinglePrimarySolidLineManager(...)` keeps reporting-line assertions readable

## Scope note
These tests intentionally stay below transport and UI layers. API wiring, repository persistence, and frontend rendering are covered in their own dedicated layers.
