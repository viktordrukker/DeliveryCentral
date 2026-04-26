# DM-8-2 — Soft-delete middleware cutover

**Status:** middleware authored, NOT registered by default. Cutover is
per-environment + per-release.

## Why opt-in?

The codebase extensively uses `archivedAt: null` filters directly in
queries. Registering the middleware globally would double-apply the
filter (harmless) AND turn every `delete()` into `update({ archivedAt
= NOW() })` (potentially breaks seed cleanup, test teardown, and any
path that genuinely wanted hard delete).

Rather than flip a switch that breaks things, we:

1. Ship the middleware (this PR).
2. Audit existing callers — every `deleteMany`/`delete` on a tracked
   model either (a) wants soft-delete (fine — new middleware does
   that automatically), or (b) wants hard delete and needs to opt in
   via `{ where: { __force: true } }`.
3. Register the middleware in `PrismaService` once the audit is
   green (follow-up PR).

## Tracked models

Listed in `SOFT_DELETE_TRACKED_MODELS` (exported from
`soft-delete.middleware.ts`). Every model with an `archivedAt` column
that participates in the standard lifecycle pattern:

- Person, OrgUnit, Project, ProjectAssignment, CaseRecord, CaseType
- Position, ReportingLine, ResourcePool
- PersonOrgMembership, PersonResourcePoolMembership
- ProjectExternalLink, ExternalAccountLink, PersonExternalIdentityLink
- CustomFieldDefinition, CustomFieldValue, EntityLayoutDefinition
- MetadataDictionary, MetadataEntry, NotificationTemplate

## Escape hatches (post-registration)

```ts
// See archived rows too
prisma.person.findMany({ where: { __includeArchived: true } });

// Hard delete (bypass soft-delete)
prisma.person.deleteMany({ where: { id: 'xxx', __force: true } });
```

## Registration (follow-up PR)

```ts
// src/shared/persistence/prisma.service.ts
import { registerSoftDeleteMiddleware } from './soft-delete.middleware';

public constructor(appConfig: AppConfig, private readonly publicIdService: PublicIdService) {
  // ... existing super() + publicId middleware ...
  if (process.env.SOFT_DELETE_ENABLED === 'true') {
    registerSoftDeleteMiddleware(this);
  }
}
```

Set `SOFT_DELETE_ENABLED=true` per environment as cutover rolls out.

## Verification

`npm run test:fast` exercises every model. Audit checklist for flipping
on each environment:

- [ ] Every `deleteMany` call in `src/modules/**` reviewed (grep `deleteMany`)
- [ ] Seed cleanup paths (`clearExistingData()` in prisma/seed.ts) either
  bypass via `__force` or deliberately use soft-delete
- [ ] Integration tests: any test that counts rows post-delete either
  filters `archivedAt: null` or uses `__force`
- [ ] Partial indexes `WHERE archivedAt IS NULL` (DM-8-3) confirmed in place

## Deprecating `deletedAt`

The strategic plan wants `archivedAt` as the canonical soft-delete
column; `deletedAt` is deprecated. That column exists on several models
today. Cleanup:

1. Audit writers: every `deletedAt` set becomes `archivedAt`.
2. Migration drops the `deletedAt` column after one release of dual-writing.
