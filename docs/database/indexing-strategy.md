# Indexing Strategy

## Goals

- fast lookup for active org and assignment state
- deterministic uniqueness for external identifiers
- efficient time-window queries for historical reconstruction
- practical support for sync, audit, and outbox processing

## External identity and sync indexes

- `ProjectExternalLink` has a uniqueness constraint on `[provider, externalProjectKey]`
- `IntegrationSyncState` has a uniqueness constraint on `[provider, resourceType, scopeKey]`
- `WorkEvidence` has a uniqueness constraint on `[workEvidenceSourceId, sourceRecordKey]`
- `WorkEvidenceLink` has a uniqueness constraint on `[workEvidenceId, provider, externalKey]`

These ensure provider records can be replayed safely without duplicating core records.

## Temporal indexes

- `ReportingLine` indexes both subject and manager with `validFrom` and `validTo`
- `PersonOrgMembership` indexes both person and org unit with date ranges
- `PersonResourcePoolMembership` indexes person and pool with date ranges
- `ProjectAssignment` indexes person/project with status and validity windows

These support historical "as-of" queries such as:

- who managed this person on a given date
- which org unit a person belonged to at approval time
- which assignments were active in a time range

## Search and workflow indexes

- `Project` indexes `name`
- `CaseRecord` indexes case type, subject person, related project, and related assignment
- `CaseStep` indexes assignee and workflow-state linkage
- `AuditLog` indexes aggregate and correlation-id lookup paths
- `OutboxEvent` indexes event publication status and availability

## Constraint notes

- Active reporting-line exclusivity is only partially enforced with relational uniqueness and date columns.
- Preventing overlapping active windows for the same relationship usually requires database exclusion constraints or application/service-layer validation.
- Prisma does not model PostgreSQL exclusion constraints directly, so overlap prevention should be added in a later SQL migration if strict database enforcement becomes mandatory.
