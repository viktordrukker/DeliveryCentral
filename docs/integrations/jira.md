# Jira Integration

## Purpose

This integration foundation treats Jira as:

- a project registry source
- a future work-evidence source

It does not treat Jira as the source of truth for staffing assignments.

## Hard rule

The platform assigns people to internal `Project` records, not to Jira issues.

That means:

- Jira issue assignees do not become `ProjectAssignment`
- Jira sync may create or enrich internal projects and external links
- Jira data must flow through adapters and anti-corruption mapping
- no raw integration code writes into assignment aggregates

## Implemented components

### Adapter layer

- `JiraProjectAdapter`
- `JiraWorkEvidenceAdapter` placeholder
- in-memory adapter implementations for initial scaffolding

### Sync flow

1. `POST /integrations/jira/projects/sync` triggers the sync service.
2. The Jira adapter fetches external Jira projects.
3. The adapter maps Jira payloads into normalized project import data.
4. The sync service:
   - creates an internal `Project` when no internal mapping exists
   - updates an already linked internal `Project` without changing its identity
   - creates or enriches `ProjectExternalLink`
   - archives only the external link when Jira marks the project archived
   - updates `ExternalSyncState`
5. Normalized integration events are published after a successful pass.

### Sync rules

- Jira projects sync into `Project` and `ProjectExternalLink`.
- Jira issues and assignees are out of scope for this slice.
- Duplicate external keys in a single sync batch are rejected.
- Duplicate mappings to different internal projects are rejected.
- Integration code does not import or mutate assignment aggregates.

### Failure handling

The sync service validates mapping conflicts before creating new project records for a given external key. If the adapter returns invalid duplicate keys or a conflicting mapping is detected, the sync fails fast instead of mutating staffing or unrelated domain data.

### Current adapter mode

The initial vertical slice uses an in-memory Jira adapter. It is configuration-driven for mapping prefix and can be replaced later with an HTTP-backed adapter without changing the Project Registry domain contracts.

### Normalized events

- `ExternalProjectDiscovered`
- `ExternalProjectUpdated`
- `ExternalProjectArchived`

### API scaffold

- `POST /integrations/jira/projects/sync`
- `GET /integrations/jira/status`

## Mapping

Mapping is configuration-driven through `JiraProjectMappingConfig`. The initial implementation derives internal project codes from the configured prefix and Jira key, with no hardcoded Jira field names leaking into project-registry entities.

## Future work evidence path

`JiraWorkEvidenceAdapter` exists as a placeholder so future prompts can import Jira worklogs into `WorkEvidence` without crossing into assignment truth.
