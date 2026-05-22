# F-85 / D-103 round 34 — Reversibility note

**Forward:** adds `createdByPersonId` + `updatedByPersonId` + FK + indexes on `PersonExternalIdentityLink` and `Tenant`.

**Rollback:** drops four indexes, four FK constraints, four columns.

**Why this pair:**
- PersonExternalIdentityLink — maps a Person to one external identity (M365/LDAP/etc.); admin can re-link on reconciliation; "who relinked" is high-value observability for identity-flow audits.
- Tenant — top-level admin-curated row that owns most other aggregates. Currently no actor-audit; the canonical pair lets ops trace tenant-level edits.
