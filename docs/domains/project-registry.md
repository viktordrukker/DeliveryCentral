# Project Registry Domain

## Purpose

Project Registry owns canonical internal project identity for the platform.

- `Project` is the business object referenced by assignments and workload logic.
- `ProjectExternalLink` attaches provider-specific identifiers such as Jira keys.
- external systems may enrich project metadata, but they do not replace internal identity.

## Implemented domain model

### Entities

- `Project`
- `ProjectExternalLink`
- `ExternalSyncState`

### Value objects

- `ProjectId`
- `ExternalSystemType`
- `ExternalProjectKey`

### Repository ports

- `ProjectRepositoryPort`
- `ProjectExternalLinkRepositoryPort`
- `ExternalSyncStateRepositoryPort`

### Application services

- `CreateProjectService`
- `LinkExternalProjectService`
- `UpdateExternalSyncStateService`
- `ArchiveProjectService`

## Rules enforced in code

- internal projects can be created manually without any external link
- imported Jira projects still get an internal `ProjectId`
- duplicate external keys within the same external system are rejected across different internal projects
- external metadata updates enrich `ProjectExternalLink` without changing `Project` identity
- external links can be archived independently of the internal project

## Persistence alignment

The domain aligns with existing Prisma models:

- `Project`
- `ProjectExternalLink`
- `ExternalSyncState`

The live application runtime now uses Prisma-backed repositories for project lifecycle state, external links, and external sync status.

`ProjectRegistryPrismaMapper` maps persistence records into domain entities for the durable runtime path.

## API readiness

DTO-shaped request contracts exist under `application/contracts` so future REST or OpenAPI handlers can map transport payloads into value objects without leaking provider-specific fields into the core domain.
