# RBAC

_Last reconciled: 2026-05-23 (post Sprints F-5 + F-8). Customizable RBAC + governance work shipped F-5 / PRs #49–#55._

## Scope

RBAC enforces authorization at the HTTP boundary on top of the authenticated principal (see [authentication.md](./authentication.md)). Implemented in `src/modules/identity-access/application/`.

## Roles

7 platform roles, defined as a const tuple in `src/modules/identity-access/domain/platform-role.ts`:

| Role | Typical scope |
|---|---|
| `employee` | Self-time, self-evidence, self-leave, self-dashboard |
| `project_manager` | Project lifecycle + approval + closure |
| `resource_manager` | Resource pools, staffing approval, capacity decisions |
| `delivery_manager` | Cross-project delivery oversight |
| `director` | Portfolio + exec dashboards + approvals SLA |
| `hr_manager` | Org structure mutations + business audit + person admin |
| `admin` | Platform settings + RBAC presets + audit retention + impersonation overlay |

"Dual-role" is a UX concept (e.g. emma.garcia is RM+HR) — a user can hold any subset of these 7. Bank-specific shapes (Squad/Tribe Lead, IT Service Owner) are added by the tenant admin via the D-159 admin UI on installation, not pre-baked.

## Decorators (controller policy)

| Decorator | File | Purpose |
|---|---|---|
| `@RequireRoles(...roles)` | `roles.decorator.ts` | Require ≥1 listed role. Throws 401 if no principal, 403 if no role overlap. |
| `@AllowSelfScope({ param: 'personId' })` | `self-scope.decorator.ts` | Allow ownership-based access — request passes if `principal.personId === request.params[param]`. Used alongside `@RequireRoles` for "employee can do X to their own row, manager can do X to anyone in scope" patterns. |
| `@ReadAction(actionName)` | `read-action.decorator.ts` | D-158 (Sprint F-5.3, flag OFF default) — read-action coverage. Resolves visibility via `ReadAccessResolverService` consulting `ResponsibilityRule`. |
| `@Public()` | `public.decorator.ts` | Bypass auth + RBAC (operator endpoints: health / metrics / setup). |
| `@SkipDemoGuard()` | `skip-demo-guard.decorator.ts` | Bypass demo-mode write guard. |

## Customizable RBAC presets (D-159, Sprint F-5.4)

- `role-presets.ts` — literal-array role bundles for common policies. Ratchet at `scripts/check-role-literal-baseline.cjs` (role-literal sites: 198 → 42 after F-5.1/F-5.2).
- `role-presets.service.ts` — runtime-resolved presets from `PlatformSetting` overrides (D-130 step 2).
- `@RequireRolePreset('preset-name')` decorator behaves identically to `@RequireRoles(...PRESET)` but reads the current preset from DB.
- Admin UI: `/admin/role-presets` (`RolePermissionAdminPage`). FE-flag OFF by default (set via `flag.adminRolePresetsEnabled`).

## Responsibility rules (`ResponsibilityRule`)

Per-row visibility policy for read-action coverage (D-158). Schema model `ResponsibilityRule` joins `(principalRole, actionName, scopeType, scopePredicate)`. Drives `ReadAccessResolverService.allowedRoles()`. Admin surface at `/admin/responsibility-rules`.

## Self-scope ownership pattern

Controllers that mix "I can act on my own row" with "manager can act on anyone's":

```ts
@Post(':personId/timesheets/:week/submit')
@RequireRoles('employee', 'hr_manager', 'admin')
@AllowSelfScope({ param: 'personId' })
public submit(@Param('personId') personId: string, ...) { ... }
```

`SelfScopeGuard` runs alongside `RbacGuard`: passes if either role check passes OR self-scope check passes. Do not duplicate ownership logic in the service layer (CLAUDE.md §4 / Pitfall #8).

## Demo-mode write guard

`demo-mode.guard.ts` — when `platform.demoMode=true`, all non-`@SkipDemoGuard()` write endpoints reject with 403. Used in investor demo + UAT seed profiles to make destructive paths safe.

## ABAC scaffolding

`abac/` subdir — attribute-based scaffolding for future policies that need richer context (org-unit hierarchy, project membership, time-bounded delegation). Not consumed by any production policy yet.

## Audit + privacy

- All RBAC failures (`401`/`403`) emit structured logs with correlation id.
- Hash-chained `AuditLog` records every write decision with actor + entity + payload + reason.
- **D-167 v1 redact-payload** (Sprint F-5.5) — on right-to-erasure, PII fields on `AuditLog.payload` get replaced with `<REDACTED>` markers; hash chain stays intact.
- **D-168 retention + cron** (Sprint F-5.6) — `admin/audit-retention` admin surface + scheduled purge job per policy.
- **D-111 AuditLog CHECK constraints** (Sprint F-5.7) — actor present + payload validity enforced at DB level.

## Failure behavior

- Missing / invalid principal → `401 Unauthorized`.
- Principal present but no matching role + no self-scope match → `403 Forbidden`.
- Demo mode write rejection → `403 Forbidden` with `code: 'DEMO_MODE_READONLY'`.

## Tenant scoping (DM-7.5, single-tenant per-bank install)

Per the bank-IT pivot (2026-05-10), each install is single-tenant. `Tenant` model exists; `tenantId` flows through the principal and is enforced via RLS on 15 aggregates. Multi-tenant code paths (T-01 in MASTER_TRACKER) stay behind `flag.tenancy.multiTenant.enabled=false` for a future SaaS pivot.

## Open work tracked in MASTER_TRACKER

- **DM-2.5-8..12** — publicId rollout (raw UUIDs are still in some URL params; CLAUDE.md memory rule forbids them in browser). Effort 8-12d.
- **D-167 v2** — cryptographic forgetting (per-row encryption + key-shred). Required for high-bar EU/UK banks. Cat-3.
- **D-153 / D-154** — notification + IdempotencyKey + IntegrationSyncState + PlatformSetting tenant scoping. P0 for multi-tenant; non-blocking for bank-IT single-tenant install.
