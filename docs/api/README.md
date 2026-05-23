# API Reference

_Last reconciled: 2026-05-23 (post Sprint F-11; bank-IT single-tenant framing)._

All endpoints are under the `/api` prefix (global). Swagger UI at `/api/docs` in non-production builds. Operator-facing endpoints (`/api/health`, `/api/readiness`, `/api/health/deep`, `/api/diagnostics`, `/metrics`) are `@Public()` — no auth required.

This file lists controller route prefixes derived from `grep -rE "Controller\(['\"]" src/modules/` (59 distinct prefixes across 37 backend modules). Per-endpoint shapes live in Swagger / the controllers themselves; this README is the navigation index.

## Operator surface (public)

| Prefix | Module | Purpose |
|---|---|---|
| `GET /health` | `health` | Liveness probe |
| `GET /readiness` | `health` | Readiness summary (DB + migrations + integrations + notifications) |
| `GET /health/deep` | `health` | DM-R-8 12-aggregate probe (per-aggregate latency + count + status) |
| `GET /diagnostics` | `audit-observability` | Operator diagnostics (DB, schema sanity, integration sync state, audit visibility) |
| `GET /metrics` | `shared/observability` | Prometheus scrape endpoint (HD-11 prom-client; counters/gauges for outbox + assignment SLA + nudge sweep) |

## Auth + identity

| Prefix | Notes |
|---|---|
| `auth` | Local-account login, password reset, 2FA, JWT cookies, refresh, impersonation overlay |
| `auth/oidc` | OIDC handler (D-155, Sprint F-4.4) — Entra-primary, IdP-agnostic. `/auth/oidc/login` + `/auth/oidc/callback` |
| `admin/persons` | Admin person admin |

## Project + portfolio

| Prefix | Notes |
|---|---|
| `projects` | Project CRUD + lifecycle (ACTIVE → CLOSED via `CloseProjectService` + `RestoreProjectService`) |
| `portfolio` | Portfolio rollup |
| `dashboard/portfolio` | Portfolio Radiator KPI surface (D-115) |
| `admin/radiator-thresholds` | `RadiatorThresholdConfig` admin (Phase PR-v1) |

## Staffing + workforce

| Prefix | Notes |
|---|---|
| `assignments` | Project assignments — canonical 9-state staffing workflow (Phase CSW, 2026-04-18). Transition endpoints: `/propose /reject /book /onboarding /assign /hold /release /complete /cancel` |
| `staffing-requests` | Demand records; derived status (Open/In progress/Filled/Closed/Cancelled) via `DeriveStaffingRequestStatusService` |
| `staffing-desk` | Approval queue + slate proposal flow; `PlannerScenario` persistence |
| `workload` | Workload calculations |
| `dashboard/workload` | Workload Overview dashboard data |
| `resource-pools` | Resource pool management |
| `admin/skills` | `Skill` + `PersonSkill` + `SkillCategory` CRUD |

## Time + leave + evidence + overtime

| Prefix | Notes |
|---|---|
| `my-time` / `time-management` | Self-time surface |
| `leave-requests` | Leave workflow (T-09 D-107 migrates to `MetadataDictionary` per F-12 plan) |
| `work-evidence` | Work evidence records (D-116 self-scope: `ALL_AUTHENTICATED_ROLES` list-own) |
| `overtime` | `OvertimePolicy` + `OvertimeException` (effective-dated) |
| `admin` includes `period-locks` | `PeriodLock` admin (D-93, Sprint F-2.0a) |

## Cases + governance

| Prefix | Notes |
|---|---|
| `cases` | Case workflow + approve action (D-91; FE button on `CaseDetailsPage`, Sprint F-3.1) |
| `exceptions` | Exception queue |
| `audit/business` | `BusinessAuditPage` source (D-114, hash-chained `AuditLog`) — HR/director/admin |
| `admin/audit-retention` | `AuditLog` retention policy + purge cron (D-168, Sprint F-5.6) |
| `undo` | Undo seam (HD-8 chunk 8.4a/b for cancel/close/deactivate) |

## Notifications + nudge + outbox

| Prefix | Notes |
|---|---|
| `notifications` | Notification request CRUD |
| `notifications/channels` | Channel admin (generic + ms_teams_webhook + email; HD-8 chunk 8.1) |
| `notifications/inbox` | In-app notification inbox |
| `me/notification-prefs` | `PersonNotificationPreference` |
| `notifications` includes `POST /nudge` | Approver nudge (24h rate-limit) — 21-09, Sprint F-3.4 |

## Help Center + onboarding

| Prefix | Notes |
|---|---|
| `help` | Public article list + detail + feedback widget + onboarding tour (HD-9, closed 2026-05-09) |
| `admin/help` | Help article editor |

## Integrations

| Prefix | Notes |
|---|---|
| `integrations` | Integration sync history + summaries |
| `integrations/jira` | Jira PPM source-filter (F-4.3) |
| `integrations/m365/directory` | M365 directory adapter; auto-provision INACTIVE Person rows on `sso.autoProvisionUsers=true` (D-156, Sprint F-8.2) |
| `integrations/radius` | Radius reconciliation |
| `admin/integrations/registry` | Uniform adapter view (NEW C1-INT-FRAMEWORK, Sprint F-8.1) — status / configured / reachable / last-sync / summary for Jira PPM, M365, RADIUS, JSM, LDAP, LLM |
| `admin/hris` | HRIS adapter admin |

**LDAP / AD adapter** lives at `src/shared/ldap/ldap-directory-adapter.ts` (NEW C1-LDAP, Sprint F-4.7) — pulls users + manager hierarchy + group membership; maps groups → platform roles via `ldap.groupRoleMap`.

**Local-LLM scaffold** is generic OpenAI-compatible client wrapper (Sprint F-4.1) — no consumer features yet.

## Customization + metadata + platform settings

| Prefix | Notes |
|---|---|
| `metadata/dictionaries` | `MetadataDictionary` + `MetadataEntry` CRUD |
| `admin/platform-settings` | `PlatformSetting` admin — drives 20+ Cat-1 settings landed in F-11 |
| `admin/role-presets` | `RolePermission` admin UI (D-159, FE flag OFF as of Sprint F-5.4) |
| `admin/responsibility-rules` | `ResponsibilityRule` admin |
| `admin/feature-flags` | Feature flag admin |
| `admin/organization-config` | Org config admin |
| `admin/rate-cards` | `RateCard` + `RateCardEntry` admin |
| `admin/system` | System admin surface |

## Reports + setup + misc

| Prefix | Notes |
|---|---|
| `reports` | Reporting surface |
| `setup` | In-app `/setup` wizard (X-Setup-Token gated; preflight → migrations → tenant → admin → integrations → monitoring → seed → complete) |
| `pulse` | Pulse mood + heatmap (T-23, off-by-default opt-in) |
| `public-holidays` | `PublicHoliday` multi-region (D-163, Sprint F-7.2) |
| `vendors` | Vendor + `VendorSkillArea` |
| `clients` | Client surface |
| `people` | People surface (alias for `org/people`) |
| `org/people` | Person CRUD (Organization domain) |
| `org/chart` | Org chart |
| `org/managers` | Manager scope |
| `org/reporting-lines` | Reporting line CRUD |
| `teams` | Operational team management |

## Conventions

- All endpoints under global `/api` prefix.
- Auth via signed JWT cookies (`Authorization: Bearer <token>` also accepted server-side).
- RBAC enforced by `@RequireRoles(...)` decorator from `src/modules/identity-access/application/roles.decorator.ts`; ownership checks via `@AllowSelfScope({ param: '...' })`; read-action policies via `@ReadAction(...)` (D-158, Sprint F-5.3, flag OFF default).
- Per-request principal: `{ userId, personId?, roles[], tenantId? }`. Impersonation overlay (admin "View as") replaces `personId`/`displayName`/`roles` transparently for downstream code.
- Public endpoints opt in via `@Public()` decorator (see `health.controller.ts`).
- New endpoints: refresh this file (or, preferably, rely on Swagger at `/api/docs`).
