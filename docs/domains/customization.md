# Customization Domain

## Purpose

Customization is a platform capability, not a side effect of schema drift.

It owns configurable metadata used to adapt the platform across customers, org units, business lines, and workflows without rewriting core domain code.

## Implemented model

### Dictionaries

- `MetadataDictionary`
- `MetadataEntry`

### Custom fields

- `CustomFieldDefinition`
- `CustomFieldValue`
- `ValidationRule`

### Workflows

- `WorkflowDefinition`
- `WorkflowStateDefinition`

### Layouts

- `EntityLayoutDefinition`

## Supported customization scenarios

- different org units can scope different request fields
- one customer can model grades while another models bands
- workflow definitions can vary by entity type and version
- layouts can vary by org scope and version
- custom fields can attach to `Project`, `Person`, `ProjectAssignment`, `WorkEvidence`, `OrgUnit`, and `Case`

## Persistence alignment

This domain aligns with the Prisma models already present in the repository:

- `MetadataDictionary`
- `MetadataEntry`
- `CustomFieldDefinition`
- `CustomFieldValue`
- `WorkflowDefinition`
- `WorkflowStateDefinition`
- `EntityLayoutDefinition`

Prisma mapping and repository placeholders are included so later persistence work can stay aligned with the domain model.

## Engineering note

Core business logic must not depend on hardcoded dictionaries because:

- customers and org units vary in terminology and policy
- workflow differences are expected product behavior, not exceptions
- layout differences should not require domain rewrites
- hardcoded dictionaries create hidden coupling that blocks extensibility and makes audit harder

Core domains should consume metadata contracts, not embed local constant lists for business classifications.
