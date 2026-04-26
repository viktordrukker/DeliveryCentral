# DM-7.5-6 — Tenant uniqueness audit

**Purpose:** decide per-constraint whether each current UNIQUE should
become **tenant-scoped** (`UNIQUE(tenantId, …)`), stay **global**, or
be **tenant-agnostic by design** (platform-level dictionary).

**Decision rubric:**

- **Tenant-scoped** — value namespace is per-tenant. Renaming in tenant A
  should never affect tenant B. Most business entities fit here.
- **Global** — value is a natural key meant to be unique system-wide.
  Rare in a multi-tenant model; flag it as a risk (tenant could block
  another tenant's value).
- **Platform-level** — a shared dictionary all tenants read from
  (currencies, country codes). Stays global by design.

---

## Already migrated

| Table | Constraint | Decision | Migration |
|---|---|---|---|
| `skills` | `UNIQUE(name)` | → `UNIQUE(tenantId, name)` | DM-7.5-7 (2026-04-23) |
| `Tenant` | `UNIQUE(code)` | **global** (system-wide tenant registry) | DM-7.5-1 |
| `Currency` | `PRIMARY KEY(code)` | **platform** (ISO 4217 shared dictionary) | DM-6a-1 |

## Needs migration (flip to tenant-scoped)

| Table | Constraint | Current | Recommended | Reason |
|---|---|---|---|---|
| `Person` | `UNIQUE(personNumber)` | global | `UNIQUE(tenantId, personNumber)` | Each tenant has its own numbering scheme. |
| `Person` | `UNIQUE(primaryEmail)` | global | `UNIQUE(tenantId, primaryEmail)` | Two tenants could legitimately employ the same person's email. |
| `OrgUnit` | `UNIQUE(code)` | global | `UNIQUE(tenantId, code)` | Org-unit codes (`ENG`, `HR`) are per-tenant. |
| `Project` | `UNIQUE(projectCode)` | global | `UNIQUE(tenantId, projectCode)` | Project codes are per-tenant. |
| `ProjectAssignment` | `UNIQUE(assignmentCode)` | global | `UNIQUE(tenantId, assignmentCode)` | Inherits tenancy from Project. |
| `CaseRecord` | `UNIQUE(caseNumber)` | global | `UNIQUE(tenantId, caseNumber)` | Tenant-issued case numbers. |
| `LocalAccount` | `UNIQUE(email)` | global | **undecided** | SSO / cross-tenant sign-on: keep global OR tenant-scope? See below. |

### `LocalAccount.email` — decision point

Two valid policies:
1. **Global email = single identity.** A human signs in once; joins
   multiple tenants as separate Person rows via a central AuthAccount.
   Keep `UNIQUE(email)`. Requires a new `AuthAccountToTenant` join.
2. **Per-tenant identity.** Tenant A's `alice@example.com` is a
   different login than Tenant B's. Flip to `UNIQUE(tenantId, email)`.

Recommend **(1) global** unless a product requirement forces (2). This
is the last-minute LocalAccount decision to take before the tenant
resolver (DM-7.5-4) lands.

## Intentionally global (platform-level)

| Table | Constraint | Reason |
|---|---|---|
| `Currency.code` | PK | ISO 4217 shared dictionary |
| `Tenant.code` | UNIQUE | tenant registry itself |
| `NotificationChannel.channelKey` | UNIQUE | platform channel definition (email, sms, inapp) |
| `NotificationTemplate.templateKey` | UNIQUE | today; may move to tenant-scoped when per-tenant templates land |
| `MetadataDictionary.(entityType, dictionaryKey, scopeOrgUnitId)` | UNIQUE | already scope-aware via OrgUnit |
| `IntegrationSyncState.(provider, resourceType, scopeKey)` | UNIQUE | scopeKey can encode tenant if multi-tenant integrations land |

## External identity links — leave global

| Table | Constraint | Reason |
|---|---|---|
| `PersonExternalIdentityLink.(provider, externalUserId)` | UNIQUE | external ID space is shared (one Okta user shouldn't map to 2 persons across tenants) |
| `ExternalAccountLink.(provider, externalAccountId)` | UNIQUE | same — the external account is singular |
| `M365DirectoryReconciliationRecord.(provider, externalUserId)` | UNIQUE | same |

## Composite uniqueness with `validFrom` — no change needed

| Table | Constraint | Note |
|---|---|---|
| `PersonOrgMembership.(personId, orgUnitId, validFrom)` | bitemporal; stays as-is |
| `PersonResourcePoolMembership.(personId, resourcePoolId, validFrom)` | bitemporal |
| `ProjectAssignment.(personId, projectId, validFrom)` | bitemporal |

`personId` / `orgUnitId` / `projectId` already carry tenancy transitively.

## Action items (follow-up migration DM-7.5-6a)

1. Flip the 6 "needs migration" constraints above to `UNIQUE(tenantId, …)`.
2. Decide `LocalAccount.email` policy + document in DMD.
3. Write integration test: Tenant A creates Person with personNumber
   'E001', Tenant B creates Person with personNumber 'E001' → second
   INSERT succeeds.

## Related

- DM-7.5-2 added `tenantId` to 15 aggregate roots; this audit shows
  which of their constraints need follow-through.
- DM-7.5-5 RLS policies complement per-tenant uniqueness: RLS prevents
  tenant A from *reading* tenant B's rows; the UNIQUE flip prevents
  tenant A from *blocking* tenant B's INSERTs.
