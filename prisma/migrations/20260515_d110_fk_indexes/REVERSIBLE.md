# F-6.1 / D-110 — Missing FK indexes

## Forward
Adds 16 single-column B-tree indexes on FK columns that were previously unindexed. Postgres does not auto-index FK columns; every JOIN against the referenced table and every `WHERE <fk> = ?` filter benefits from an index scan.

| Index | Column |
|---|---|
| `PersonReleaseRequest_initiatedByPersonId_idx` | `initiatedByPersonId` |
| `ProjectActivationApproval_requestedById_idx` | `requestedById` |
| `ProjectActivationApproval_decidedById_idx` | `decidedById` |
| `ExternalAccountLink_personId_idx` | `personId` |
| `ProjectAssignment_appliedRateCardEntryId_idx` | `appliedRateCardEntryId` |
| `CaseType_workflowDefinitionId_idx` | `workflowDefinitionId` |
| `NotificationRequest_channelId_idx` | `channelId` |
| `RateCard_currencyCode_idx` | `currencyCode` |
| `PersonSkill_skillId_idx` | `skillId` |
| `OvertimePolicy_setByPersonId_idx` | `setByPersonId` |
| `OvertimeException_caseRecordId_idx` | `caseRecordId` |
| `Client_accountManagerPersonId_idx` | `accountManagerPersonId` |
| `BudgetApproval_decidedByPersonId_idx` | `decidedByPersonId` |
| `EmploymentEvent_recordedByPersonId_idx` | `recordedByPersonId` |
| `ProjectRetrospective_facilitatedByPersonId_idx` | `facilitatedByPersonId` |
| `ProjectRisk_convertedFromRiskId_idx` | `convertedFromRiskId` |

`CREATE INDEX IF NOT EXISTS` makes the migration idempotent. Postgres builds these online for non-LARGE tables; for very large tables `CREATE INDEX CONCURRENTLY` would be safer, but DC's tables are all well under that threshold (largest is `AuditLog` at ~10k rows on staging).

## Backward
`rollback.sql` drops each index with `DROP INDEX IF EXISTS`. Dropping an index never destroys data — only the secondary access path.

## CI guardrail
`scripts/check-fk-indexes.cjs` walks every `*Id` field declared as part of a `@relation(fields: [...])` and asserts each is covered by an `@id`, `@unique`, `@@unique([<fk>, …])`, or `@@index([<fk>, …])`. New violations FAIL the architecture-check workflow. Wired into `verify:pr` and `.husky/pre-commit`.
