# Schema Overview

## Purpose

The database foundation supports the first serious persistence slice for:

- Organization and org-chart history
- Project registry with separate external links
- Formal staffing assignments and approval history
- Work evidence captured independently from staffing truth
- Onboarding/offboarding and other operational cases
- Metadata-driven customization
- Audit, outbox, and integration sync tracking

## Design rules captured in schema

### Internal project identity versus external links

- `Project` is the canonical internal project record.
- `ProjectExternalLink` stores provider-specific keys and URLs.
- `ExternalSyncState` tracks link-level synchronization health.
- A project may exist before any external link exists.
- An external link may be archived while the internal project remains active.

### Formal assignment versus work evidence

- `ProjectAssignment` is the authoritative planned staffing record.
- `AssignmentApproval` and `AssignmentHistory` preserve approval routing and change traceability.
- `WorkEvidence` stores observed activity or time independently from assignments.
- `WorkEvidenceSource` and `WorkEvidenceLink` preserve provenance and external traceability.
- The schema supports both:
  - assignment without work evidence
  - work evidence without assignment

### Historical org reconstruction

- `PersonOrgMembership`, `ReportingLine`, `PersonResourcePoolMembership`, and `Position` carry `validFrom` / `validTo`.
- `ReportingLineType` distinguishes solid-line and dotted-line relationships.
- `ReportingAuthority` separates approval authority from visibility or review-only relationships.
- This supports manager changes over time and matrix visibility patterns.

### Metadata and customization

- `MetadataDictionary` and `MetadataEntry` provide reusable controlled vocabularies.
- `CustomFieldDefinition` and `CustomFieldValue` support generic extension across entity types.
- `WorkflowDefinition`, `WorkflowStateDefinition`, and `EntityLayoutDefinition` support configurable workflow and presentation metadata without changing core table ownership.

### Cases

- `CaseRecord` attaches to a subject person and can optionally link to a project and assignment.
- `CaseType`, `CaseStep`, and `CaseParticipant` support onboarding, offboarding, and other process orchestration without collapsing into assignment workflow.

### Technical platform records

- `AuditLog` stores append-only business and system audit records.
- `OutboxEvent` supports reliable event publication patterns.
- `IntegrationSyncState` stores provider/resource/scope sync cursors and status.

## Major tables by domain

### Organization & Org Chart

- `Person`
- `OrgUnit`
- `Position`
- `PersonOrgMembership`
- `ReportingLine`
- `ResourcePool`
- `PersonResourcePoolMembership`

### Project Registry

- `Project`
- `ProjectExternalLink`
- `ExternalSyncState`

### Assignment & Workload

- `ProjectAssignment`
- `AssignmentApproval`
- `AssignmentHistory`

### Work Evidence

- `WorkEvidenceSource`
- `WorkEvidence`
- `WorkEvidenceLink`

### Cases

- `CaseType`
- `CaseRecord`
- `CaseStep`
- `CaseParticipant`

### Customization / Metadata

- `MetadataDictionary`
- `MetadataEntry`
- `CustomFieldDefinition`
- `CustomFieldValue`
- `WorkflowDefinition`
- `WorkflowStateDefinition`
- `EntityLayoutDefinition`

### Platform / Technical

- `AuditLog`
- `OutboxEvent`
- `IntegrationSyncState`

## Soft-delete and archival approach

- Operationally important tables include `archivedAt` and, where useful, `deletedAt`.
- `archivedAt` is the primary business-retention mechanism.
- Hard deletes should be rare and usually limited to non-authoritative technical cleanup or explicit data governance workflows.

## Migration readiness

- The Prisma schema is ready for `prisma migrate dev`.
- A placeholder migration folder exists and should be replaced by a generated migration once dependencies are installed and a database is available.
