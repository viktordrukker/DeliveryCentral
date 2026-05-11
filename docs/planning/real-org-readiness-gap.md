# Real-Organization Readiness Gap

**Phase:** 9 of 12 (`docs/planning/CLAUDE_CODE_RESEARCH_PROMPT.md` Phase 9)
**Date:** 2026-05-10
**Method:** static audit of `prisma/schema.prisma` (105 models), `src/modules/**/*.ts`, `frontend/src/**/*.{ts,tsx}`, `docs/runbooks/`. Three Explore subagents dispatched in parallel against (security/identity), (org-structure/locale/timezone), (lifecycle/Day-2 ops). Cross-references the Phase 1-8 audits and `HARDEN_BRIEF.md`.

---

## Context

Phase 1-8 catalogued the gaps a careful engineer notices in the seed-driven `it-company` profile (200 people / 40 projects / 5-year history). That profile masks the gaps a *real* customer would hit on contact with reality: a 5,000-person org with a fiscal year that does not start January 1, monetary rates in three currencies, distributed teams across UTC+0/+5:30/+8/+10, an Okta IdP that owns identity lifecycle, an HRIS that owns the org chart, and a 30-year retention/compliance posture. This audit catalogues those gaps as a Day-1 / Week-1 / Month-1 timeline of breakage and proposes 18 closing tasks, of which 4 are Blocker-tier.

The audit is **complementary** to the Phase 1-8 register, not a re-mint:
- Tenant-scoping schema work is owned by `HARDEN_BRIEF.md` F6.1-F6.3 (the `NOT NULL` flip + RLS enable). Phase 9 catalogues the **80 of 105 models that don't yet carry `tenantId` at all**, plus the queries that don't filter on it.
- D-96 owns the dual soft-delete (`archivedAt` vs `deletedAt`) decision. Phase 9 reports that the GDPR purge path that would consume that decision **does not exist** in the codebase.
- D-103 (actor-audit gap), D-107 (enum→MetadataDictionary), D-108 (effective-dating uniformity), D-122..D-132 (customization debt), D-130 (responsibility-matrix RBAC) are referenced where they close the same gap. Phase 9 mints new D-IDs only when an existing item does not cover the finding.

---

## 1. Day-1 / Week-1 / Month-1 timeline of breakage

What a real 5,000-person customer hits when they install the wizard, point Okta at it, paste in their org chart CSV, and try to run a director-portfolio review.

### Day 1 — what blocks deployment immediately

| Gap | Severity | Evidence | Closing task |
|---|---|---|---|
| Okta SSO has no callback handler — `sso.*` settings + `openid-client` dep wired, but no `/auth/oidc/*` route | **Blocker** | `src/modules/platform-settings/application/platform-settings.service.ts:33-41` (settings exist), `src/modules/auth/presentation/auth.controller.ts:1-228` (no OIDC route); `package.json:openid-client@6.8.2` is a dead dep | **D-155** |
| Capitalisation/budget reports cannot consolidate USD + EUR + GBP rates; no FxRate model | **Blocker** | `prisma/schema.prisma` has zero `FxRate`/`exchangeRate`; `src/modules/financial-governance/` sums native currencies | **D-164** |
| Fiscal year != Jan 1 silently broken — `general.fiscalYearStart` setting unused; reports compute `Date.UTC(fiscalYear, 0, 1)` | **Blocker** | `src/modules/financial-governance/infrastructure/financial.repository.ts:216-217`; `platform-settings.service.ts:9` | **D-160** |
| AU-only public holidays — global default; multi-region tenants cannot register UK/IN/US holidays | Major | `prisma/schema.prisma` `PublicHoliday.countryCode @default("AU")` (~line 2210), `public-holiday.service.ts:15` | **D-163** |
| Multi-tenant single-DB hosting leaks: `NotificationChannel/Template/Request`, `IdempotencyKey`, `IntegrationSyncState`, `PlatformSetting` lack `tenantId` | Major (Blocker if isolation is contractual) | `prisma/schema.prisma:1395, 1412, 1432, 1325, 1378, 1770` | **D-153** |

### Week 1 — what surfaces during pilot use

| Gap | Severity | Evidence | Closing task |
|---|---|---|---|
| Singapore RM + London PM see misaligned week boundaries — `getMondayOfWeek(new Date())` runs in server UTC; `general.timezone` setting unused; `weekStartDay` setting unused | Major | `src/modules/pulse/application/pulse.service.ts:14-22, 41`; `platform-settings.service.ts:8, 15` (settings exist, never consumed) | **D-161** |
| Frontend always renders dollars in `en-US` — `Intl.NumberFormat('en-US', {currency:'USD'})` hardcoded; no read of `general.currency` or user locale | Major | `frontend/src/.../BudgetCapexOpexSummary.tsx:15`, `VendorEngagementPanel.tsx:11`; 120 raw `new Date()` calls; `date-fns-tz` not installed | **D-165** |
| 330 `@RequireRoles` decorators are static — read endpoints (every `@Get`) cannot delegate to ResponsibilityRule; tenant-defined custom roles impossible | Major | 330 invocations / 52 distinct patterns; `ResponsibilityRule` covers MUTATIONS only (`prisma/schema.prisma:236`, `ResponsibilityActionKind` enum lines 77-84); top read pattern `@RequireRoles('admin')` ×67 | **D-158** (extends D-130) |
| M365 reconciliation does not auto-create Person rows on directory pull | Major | `src/modules/integrations/m365/m365-directory-adapter.ts:1-38` (read-only `fetchUsers/fetchManagers`); zero consumer of `sso.autoProvisionUsers` setting | **D-156** |
| Webhook event types are unconstrained `string[]` — integrators cannot self-discover the schema | Minor | `src/modules/admin/presentation/admin-config.controller.ts:315-344` (`InMemoryWebhookService.dispatch(eventType: string, payload)`); no event-type registry | **D-170** |

### Month 1 — what becomes a real cost / risk

| Gap | Severity | Evidence | Closing task |
|---|---|---|---|
| GDPR right-to-erasure has no implementation — zero hits for `purge\|forget\|gdpr` in `src/`; AuditLog (`prisma/schema.prisma:1294-1317`) hash-chained, indefinite retention, never redacted | **Blocker** for EU/UK | `grep -rln "purge\|forget\|gdpr" src/` → empty; AuditLog has `actorId onDelete: SetNull` but no payload-PII redaction | **D-167** |
| AuditLog has no retention/auto-purge — admin cannot honor GDPR Art. 5(1)(e) storage limitation | Major | `evidenceManagement.retentionDays` is nullable (default = indefinite); no purge cron; AuditLog has no `expiresAt` | **D-168** |
| Bulk import is Person-only, CSV-only, sync, no rollback — Project / OrgUnit / Skill / RateCard / PersonCostRate cannot be imported | Major | `src/modules/admin/presentation/admin-config.controller.ts:222-311` (only `/admin/people/import/preview` + `/confirm`); no `ImportBatch` model in schema | **D-166** |
| BI integrations cannot poll incrementally — no `/api/reports/*/export`, no cursor pagination, no `modifiedSince` filter | Major | `src/modules/reports/` has 3 GET endpoints, all JSON-only; zero hits for `cursor\|modifiedSince` in reports | **D-169** |
| 11 known Level-1 customization debts (D-122..D-132) understate real-org breadth — at least 5 more emerge under workload (per-project SLA, per-skill matching weights, per-org allocation ceiling, per-workflow timesheet lock window, industry presets) | Minor (additive) | `assignment-sla.service.ts:33-38`, `hr-manager-dashboard-query.service.ts:171`, `platform-settings.service.ts:18, 92-101, 154`, `reports/utilization.service.ts:45` | **D-171** (extends D-122..D-132) |
| Tenant cannot redefine roles or role-permission sets — fixed list of 8 roles; no admin UI for "what can a project_manager do here" | Minor / DECIDE | no `RolePermissionAdminPage` in `frontend/src/routes/admin/`; only `ResponsibilityMatrixAdminPage` exists | **D-159** |
| SCIM 2.0 server endpoints absent — IdP-driven user lifecycle (deprovision on Okta removal) requires implementation | DECIDE | zero `/scim/Users\|/scim/Groups` routes; M365 reconciliation is the closest but pull-mode only | **D-157** |

---

## 2. Per sub-area findings (a–k)

### (a) Tenant scoping reality

**Coverage today:** 25 of 105 prisma models declare `tenantId`. RLS policies and resolver middleware are scaffolded but gated off (`HARDEN_BRIEF.md:91, 336-338` — `flag.tenantRlsEnabled=false`, the J1 "deployment-isolated tenancy" decision).

**What is scoped:** Person (`prisma/schema.prisma:505`), OrgUnit (line 653), Project (line 819), ProjectAssignment (line 922), WorkEvidence (line 1012), CaseRecord (line 1083), AuditLog (line 1306), OutboxEvent (line 1367), TimesheetWeek (line 1515), HelpArticle (line 1799), LocalAccount (line 1572), PersonReleaseRequest (line 148), ProjectActivationApproval (line 189), ResponsibilityRule (line 236). 25 total.

**What is not scoped (sample of obviously multi-tenant aggregates):**
- `NotificationChannel` (line 1395), `NotificationTemplate` (line 1412), `NotificationRequest` (line 1432), `NotificationDelivery` (line 1459) — notification setup leaks across tenants
- `PlatformSetting` (line 1770) — singleton table; one tenant's `general.currency=AUD` overrides another's USD
- `IdempotencyKey` (line 1325) — concurrent requests from two tenants with the same `(method, path, key, actor_id)` collide
- `IntegrationSyncState` (line 1378) — M365 sync state shared
- `TimesheetEntry` (line 1524) — child of `TimesheetWeek` so naturally scoped, but a query on TimesheetEntry alone has no `where: { tenantId }`

**Repository sample (queries do NOT filter on tenantId, even where the column exists):**
- `src/modules/staffing/infrastructure/workload.repository.ts:41` — `projectAssignment.findMany({ where: { status, validFrom, validTo } })`
- `src/modules/time-management/infrastructure/timesheet.repository.ts:18` — `timesheetWeek.findUnique({ where: { personId_weekStart } })`
- `src/modules/financial-governance/infrastructure/financial.repository.ts:36` — `timesheetEntry.findMany({ where: { status, date: { gte, lte } } })`

**Verdict: gap.** A real customer's expectation: hosting two business units on the same DB is supported via a single `tenantId` resolver flag; RLS enforces isolation. **Today:** even with RLS off, 80 models lack the column entirely, and queries against the 25 scoped models do not include `where: { tenantId }`. The HARDEN_BRIEF F6 work plan does not cover the 80 unscoped models.

**Closing tasks:** **D-153** (add `tenantId` to notification suite + IdempotencyKey + IntegrationSyncState; PlatformSetting needs a separate decision per HARDEN_BRIEF F6); **D-154** (repository tenant-filter ratchet — wire a Prisma middleware extension that injects `where: { tenantId: ctx.tenantId }` and a CI lint).

### (b) Custom RBAC + responsibility matrix

**Coverage today:** ResponsibilityRule + resolver shipped (HD-4 closed 2026-05-06). 7 default `mode=ROLE` rules seeded at the TENANT scope. `prisma/schema.prisma:236`, `ResponsibilityActionKind` enum (lines 77-84) covers 7 actions, all approval-flow shaped.

**Coverage shape — 330 `@RequireRoles` invocations / 52 distinct patterns** (top 5):
1. `@RequireRoles('admin')` ×67
2. `@RequireRoles('project_manager','delivery_manager','director','admin')` ×29
3. `@RequireRoles('project_manager','resource_manager','delivery_manager','director','admin')` ×24
4. `@RequireRoles('hr_manager','director','admin')` ×22
5. `@RequireRoles('employee','project_manager','resource_manager','hr_manager','delivery_manager','director','admin')` ×11

**Gap:** the resolver runs only in 6 services (HD-2 submit/decide, HD-5 open/decide, HD-6 request/decide). The 330 controller decorators are static — no read endpoint (`@Get`) consumes a rule. A tenant cannot redefine "what can a project_manager do" or define a custom role.

**Frontend admin UIs (`frontend/src/routes/admin/`):**
- `ResponsibilityMatrixAdminPage.tsx` — exists, governs approval rules only
- No `RolePermissionAdminPage` or `CustomRoleAdminPage`
- No mechanism for tenant to add `program_manager` or rename `delivery_manager` to `engagement_lead`

**Verdict: partial.** D-130 already plans the 3-step constants→PlatformSetting→ResponsibilityRule path for the 330 decorators. Phase 9 adds two scope expansions:
1. ResponsibilityRule's enum is mutation-only — extend with `READ_REPORT`, `READ_FINANCIAL_DATA`, etc., or build a sibling for reads.
2. Without a tenant-admin redefinition UI, the "tenant-configurable roles" promise is not fulfillable.

**Closing tasks:** **D-158** (extend D-130 to cover read endpoints), **D-159** (tenant role redefinition admin UI + decision).

### (c) Org structure depth + fiscal calendar

**Org depth:** `OrgUnit` schema supports arbitrary depth via `parentOrgUnitId String?` self-FK (`prisma/schema.prisma:634, 642-643`). PersonOrgMembership supports multi-unit + dotted-line via `isPrimary` flag (line ~691) and `@@unique([personId, orgUnitId, validFrom])`. **Schema is fine; seed depth is shallow** — `prisma/seeds/it-company-profile.ts` lines ~479-490 produce Root → Directorate → Department = 3 levels (4 with root). Real-org expectation 5 levels (Company → Region → BU → Dept → Team). This is a **seed gap, not a schema gap**.

**Fiscal year — Blocker:**
- Setting exists: `'general.fiscalYearStart': 1` (`platform-settings.service.ts:9`)
- Setting is read at `platform-settings.service.ts:143` into the `GeneralSettings` DTO
- **Setting is never consumed for date arithmetic.** `src/modules/financial-governance/infrastructure/financial.repository.ts:216-217` hardcodes:
  ```ts
  const yearStart = new Date(Date.UTC(fiscalYear, 0, 1));
  const yearEnd = new Date(Date.UTC(fiscalYear, 11, 31));
  ```
- `ProjectBudget.fiscalYear Int` (line 1635) — scalar, no first-class FiscalCalendar/FiscalPeriod entity. UK FY=Apr1, AU FY=Jul1, US fed FY=Oct1 cannot be expressed.

**Holidays:** `PublicHoliday.countryCode @default("AU")` (~line 2210), `public-holiday.service.ts:15` defaults to `'AU'`. No tenant-level region; a multi-region tenant cannot register UK + IN holidays simultaneously.

**Verdict: gap (Blocker on fiscal year).** A real customer with FY != Jan 1 produces broken capitalisation reports immediately.

**Closing tasks:** **D-160** (consume `general.fiscalYearStart` in financial reports + add FiscalCalendar/FiscalPeriod entity for non-overlapping fiscal-period rollups), **D-163** (tenant-region scoping for PublicHoliday).

### (d) Currency + locale

**Schema:** Per-row `currencyCode` on `PersonCostRate` (~line 1804), `RateCard` (1868), `RateCardEntry`, `ProjectAssignment.effectiveBillCurrency`, `ProjectBudget.currencyCode` (1642). Monetary values are `Decimal(10,2)` or `Decimal(15,2)` — correct.

**Tenant home currency:** `'general.currency': 'AUD'` (`platform-settings.service.ts:11`); read into DTO at line 145.

**Gap — multi-currency consolidation has no implementation:**
- Zero `FxRate`/`ExchangeRate` model in `prisma/schema.prisma`
- Zero `convertToHomeCurrency`/`multiCurrencyTotal` service in `src/`
- `src/modules/financial-governance/application/financial.service.ts` lines ~61-196 sums per-project capex/opex in native currencies — does not convert to home currency

**Frontend formatter — Major bug:**
- `frontend/src/.../BudgetCapexOpexSummary.tsx:15`: `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` — hardcoded
- `VendorEngagementPanel.tsx:11`: same pattern
- Zero usage of `toLocaleString()`/`Intl.DateTimeFormat` for locale-aware formatting

**Verdict: partial.** Schema is multi-currency-correct. Reports and FE rendering are USD-only.

**Closing tasks:** **D-164** (FxRate model + capitalisation/budget consolidation in tenant home currency), **D-165** (FE currency formatter wiring + date-fns-tz adoption).

### (e) Time zones

**Schema strong:** 302 of 325 DateTime columns are `@db.Timestamptz(3)`. The 23 non-Timestamptz are all `@db.Date` (`weekStart`, `validFrom/validTo` on rate cards, `date` on TimesheetEntry, `date` on PublicHoliday). No DateTime-without-tz leaks.

**Service-side gap:**
- `'general.timezone': 'UTC'` (`platform-settings.service.ts:8`); read into DTO at line 142 — **never consumed**
- `'timesheets.weekStartDay': 1` (line 15); read into DTO at line 151 — **never consumed**
- `src/modules/pulse/application/pulse.service.ts:14-22, 41`: `getMondayOfWeek(new Date())` uses server UTC; ignores tenant timezone and weekStartDay
- Same pattern in `radiator-override.service.ts:48`, `spc.service.ts:55`

**Frontend gap:**
- `date-fns@4.1.0` installed; `date-fns-tz` **NOT** installed (`frontend/package.json:27`)
- 120 raw `new Date()` calls across `frontend/src/`
- `frontend/src/.../WorkforcePlanner.tsx:2`, `WorkloadPlanningPage.tsx:5`: `startOfWeek()` from `date-fns` with no locale parameter — defaults to ISO Monday in UTC

**Cross-timezone consequence:** Singapore RM (UTC+8) opens her dashboard at SGT Mon 10am. The "this week" pulse query computes `getMondayOfWeek(new Date())` in server UTC — server might still be in Sun UTC. She sees last week's pulse data. London PM (UTC+0/+1) sees what looks like the same week to him but a different date range to her.

**Verdict: partial.** Schema-level timezone hygiene is excellent; service-side computations are not.

**Closing tasks:** **D-161** (parameterize week-boundary helpers; consume `general.timezone` and `timesheets.weekStartDay`), **D-165** (covers FE date-fns-tz adoption).

### (f) Bulk import + data migration

**Today:** Person-only, CSV-text body, sync, no batch tracking, no rollback.
- `src/modules/admin/presentation/admin-config.controller.ts:222-269` (preview), `:271-311` (confirm)
- `frontend/src/routes/admin/BulkImportPage.tsx`, `frontend/src/lib/api/bulk-import.ts`
- Idempotency: row-by-row `findFirst({primaryEmail})` then create-or-skip (line 288-291)
- No `ImportBatch`/`BulkImportJob` model in `prisma/schema.prisma`
- Chunking (CHUNK_SIZE=100, line 279) is loop ergonomics, not transactional

**Missing entity importers (zero hits in `src/modules/*/presentation/` for "import"):** Project, ProjectAssignment, Skill, PersonSkill, ResourcePool, OrgUnit, Client, RateCard, PersonCostRate.

**Format gaps:** no XLSX upload, no multi-file zip, no async background job + status email.

**Race window:** between `preview` and `confirm`, an admin can update a row's email; `confirm` then dedupes against the new email and creates a duplicate row.

**Verdict: gap.** Real-org expectation: HRIS-driven OrgUnit + Person + cost rates + skill catalog import on Day 1. Today's importer covers 1 entity of 9.

**Closing task:** **D-166** (entity coverage + ImportBatch model + transactional rollback + XLSX support).

### (g) Compliance / data residency / GDPR purge

**GDPR right-to-erasure:** zero hits for `purge|forget|gdpr|right.to.be.forgotten` in `src/`. No admin endpoint to "forget person X". No PII-scrubbing strategy for audit/event payloads.

**AuditLog conflict:** `prisma/schema.prisma:1294-1317` — hash-chained (`prevHash`, `rowHash`, `chainSeq`), indefinite retention by design. `actorId` is `onDelete: SetNull`, so erasing a Person leaves orphan audit rows with their `displayName`/`email` still in `payload` JSON. Forensic tamper-evidence is intentionally at odds with GDPR Art. 17 erasure.

**Soft-delete:** Person/Project/OrgUnit have both `archivedAt` and `deletedAt` (per D-96). In practice only `archivedAt` is used; `deletedAt` is dead weight.

**Data residency:** zero hits for region-pinning in code or `docs/`. `monitoring.datadog.region` is a Datadog ingest region, not a data-residency control.

**Retention policy:** `evidenceManagement.retentionDays` is nullable (default null = indefinite). No `audit.retentionDays`. No purge cron.

**Verdict: gap (Blocker for EU/UK customers).**

**Closing tasks:** **D-167** (right-to-erasure endpoint + AuditLog redaction strategy — decision: redact payload PII vs. delete the row vs. cryptographic forgetting), **D-168** (audit retention policy + auto-purge scheduler).

### (h) SSO + auto-provisioning

**Settings exist:** `sso.enabled`, `sso.providerName`, `sso.issuerUrl`, `sso.clientId`, `sso.clientSecret`, `sso.scopes`, `sso.callbackUrl='/auth/oidc/callback'`, `sso.autoProvisionUsers`, `sso.defaultRole` (`platform-settings.service.ts:33-41`).

**Implementation absent:**
- `src/modules/auth/presentation/auth.controller.ts:1-228` — has `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/password-reset/*`, `/auth/2fa/*`, `/auth/me`, `/auth/providers`. **No `/auth/oidc/*` route.**
- `package.json` includes `openid-client@6.8.2` — installed but unused. No `passport-openidconnect` or `passport-saml`.
- `sso.autoProvisionUsers` is settings-only — zero consumer in `src/`.

**M365 reconciliation:** `src/modules/integrations/m365/m365-directory-adapter.ts:1-38` defines `fetchUsers/fetchManagers/mapExternalUserToInternal` interfaces. **Inbound directory pull only — does not auto-create Person rows.**

**SCIM 2.0:** zero `/scim/Users` or `/scim/Groups` routes in `src/`.

**Verdict: gap (Blocker for any SSO-mandated customer).** Day 1 a real Okta customer cannot log in.

**Closing tasks:** **D-155** (OIDC handler + passport strategy + autoProvisionUsers wiring), **D-156** (M365 auto-create on reconciliation), **D-157** (SCIM 2.0 server stub — DECIDE).

### (i) Customization breadth at scale

**Already captured (D-122..D-132 — 11 Level-1 debts):** SLA pre-breach windows, SLA risk score, project risk defaults + critical threshold, closure budget %, role-list constants, nudge sweeper windows, staffing-suggestions weights, cadence MetadataDictionary, FE risk-enum labels, Grade const.

**Phase 9's scaling lens — 5 additional debts emerge under realistic workload:**

| # | Where | Magic value | Tenant-level expectation |
|---|---|---|---|
| 1 | `assignment-sla.service.ts:33-38` | `proposalDays:2, reviewDays:1, approvalDays:2, rmFinalizeDays:1` | Per-project SLA profiles (fintech 24h, healthcare 5d, public-sector 10d) |
| 2 | `platform-settings.service.ts:92-101` | matching weights `skill:25, proficiency:15, importance:15, availability:15, recency:5, grade:10, domain:5, language:3, tz:2, cert:5` | Per-skill or per-domain weight overrides; current is global |
| 3 | `hr-manager-dashboard-query.service.ts:171` | `if ((alloc[id] ?? 0) > 100)` — over-allocation flag | Per-org allocation ceilings (consulting 110%, public-sector 100% strict) |
| 4 | `platform-settings.service.ts:18, 154` | `timesheets.lockAfterDays:14` | Per-workflow lock windows (weekly audit 7d, monthly close 30d) |
| 5 | `platform-settings.service.ts:46-48`, dashboards | `staffingGapDaysThreshold:28`, `nearingClosureDaysThreshold:30`, `evidenceInactiveDaysThreshold:14` | Per-workflow thresholds (sprint 14d, waterfall 60d, product 90d) |

**Cross-cutting opportunity:** ship **industry preset profiles** (Finance / Healthcare / Tech / Public-Sector) that bundle several settings into one click.

**Verdict: partial (additive).**

**Closing task:** **D-171** (extends D-122..D-132 with the 5 scaling-lens debts + industry presets).

### (j) Operational runbooks

**Coverage is genuinely strong** — 7 runbooks (665 lines):
- `chaos-drills.md` (112 lines) — quarterly game-day, 9 scenarios, pass/fail criteria with TTD/TTC/TTR targets
- `pitr-restore.md` (93) — pg_basebackup weekly + WAL archive 60s RPO, RTO ≤ 15m, monthly drill required (DM-R-25); failed drill = Sev-2
- `panic.md` (61) — read-only → halt → restore escalation ladder
- `dm-8-2-soft-delete-cutover.md`, `dm-r-20-role-separation-cutover.md`, `dm-r-30-read-replica.md`, `partition-cutover.md`

**Health probes:** `/health`, `/readiness`, `/health/deep`, `/diagnostics` (admin-gated) — `src/modules/health/health.controller.ts:13-65`. `/metrics` Prom endpoint already shipped under HD-11 (`src/shared/observability/`).

**Setup:** `/setup` wizard exists (per `CLAUDE.md` §10).

**Verdict: ready.** No new D-item needed. Acknowledged the spec wanted Phase 9 to look here; the answer is "this part is fine".

**No closing task minted.** The single small follow-up (chaos-ic-rotation runbook) is operational housekeeping, not a Phase 9 finding.

### (k) Reporting / extracts

**Today (`src/modules/reports/`):**
- `GET /reports/utilization` — supports `from/to/orgUnitId/personId/stdHoursPerDay`; default 30 days; **no pagination**
- `GET /reports/builder/sources` — lists data sources
- `GET/POST/DELETE /reports/templates` — template CRUD; **no cursor**
- Zero `/api/reports/*/export` route; zero `cursor`/`paginate`/`limit` in this module

**Webhook posture:** `InMemoryWebhookService` in `admin-config.controller.ts:315-344`; `dispatch(eventType: string, payload)` is unconstrained — no event-type registry, no schema documentation.

**BI consequence:** Snowflake / Power BI / Tableau cannot poll incrementally. Each sync re-queries the entire dataset. No webhook self-discovery for integrators.

**Verdict: partial.**

**Closing tasks:** **D-169** (CSV/XLSX export + cursor pagination + `modifiedSince` filter — references D-148/149 from Phase 8 for ETag/CDN posture on cacheable extracts), **D-170** (webhook event-type registry + schema docs).

---

## 3. Cross-reference table to existing tracker items

This audit explicitly avoids re-minting findings already owned by an earlier D-id.

| Existing item | Owner | Phase 9 relationship |
|---|---|---|
| `HARDEN_BRIEF.md` F6.1-F6.3 | tenant `NOT NULL` flip + RLS enable on the **25 already-scoped** models | Phase 9 D-153/D-154 cover the **80 unscoped** models + the query-filter ratchet — additive, not duplicate |
| `HARDEN_BRIEF.md` J1 ("multi-tenancy: HOLD") | the iteration-level decision to ship deployment-isolated, not SaaS | Phase 9 catalogues what's still required IF the J1 decision flips back to SaaS |
| **D-96** | Person/Project/OrgUnit dual soft-delete decision (`archivedAt` vs `deletedAt`) | Phase 9 D-167 (GDPR erasure) is the consumer of D-96's decision; Phase 9 reports D-96's decision is unimplemented |
| **D-103** | actor-audit gap (0/105 models with `createdById`) | Not duplicated; Phase 9 mentions it inline with audit-trail context |
| **D-107** | 9 enums → MetadataDictionary migration | Phase 9 D-171 lists adjacencies but does not re-mint |
| **D-108** | effective-dating uniformity | Mentioned for fiscal-period entity (D-160) — Phase 9 doesn't override the convention |
| **D-110** | FK indexes | Prerequisite for D-160 fiscal-period rollups + D-169 BI extracts |
| **D-122..D-132** | 11 Level-1 customization debts | Phase 9 D-171 adds 5 more scaling-lens debts; explicitly extends, not replaces |
| **D-130** | role-list named constants → ResponsibilityRule | Phase 9 D-158 extends D-130's scope to read endpoints; D-159 adds the tenant-admin redefinition UI |
| **D-148** (Phase 8) | CDN-able tenant-shared metadata | Phase 9 D-169 references for cacheable extract endpoints |
| **D-149** (Phase 8) | ETag for heatmaps + radiator | Phase 9 D-169 references for export-endpoint posture |

---

## 4. Top 10 must-fix-before-real-customer items

Ranked by deployment-blocking severity then breadth.

| Rank | Severity | Task | Phase 9 D-id | Customer trigger |
|---|---|---|---|---|
| 1 | **Blocker** | OIDC SSO callback handler + passport strategy + autoProvisionUsers wiring | **D-155** | Day 1: Okta tenant cannot log in |
| 2 | **Blocker** | FxRate model + multi-currency consolidation in capitalisation/budget reports | **D-164** | Day 1: USD + EUR project rates produce non-comparable native-currency P&L |
| 3 | **Blocker** | Fiscal calendar entity + period-aware financial rollups (consume `general.fiscalYearStart`) | **D-160** | Day 1: any tenant whose FY != Jan 1 sees broken capitalisation reports |
| 4 | **Blocker** | GDPR right-to-erasure endpoint + AuditLog redaction strategy | **D-167** | Day 1 for EU/UK; immediate regulatory exposure |
| 5 | **Major** | Tenant-scoping coverage gap: NotificationChannel/Template/Request/Delivery + IdempotencyKey + IntegrationSyncState lack `tenantId` | **D-153** | Week 1: cross-tenant notification template visibility, idempotency-key collisions |
| 6 | **Major** | Tenant timezone + weekStartDay propagation; parameterize week-boundary helpers | **D-161** | Week 1: cross-timezone teams see misaligned week boundaries on dashboards/pulse |
| 7 | **Major** | Frontend `Intl.NumberFormat` consume `general.currency` + user locale; install `date-fns-tz` | **D-165** | Week 1: AUD tenant sees `$` everywhere as USD |
| 8 | **Major** | ResponsibilityRule extension to read endpoints (extends D-130) | **D-158** | Week 1: 330 `@RequireRoles` decorators on `@Get` cannot consume tenant rules |
| 9 | **Major** | Bulk-import scope expansion: Project/OrgUnit/Skill/RateCard + XLSX + ImportBatch + transactional rollback | **D-166** | Day 1 for HRIS-driven onboarding; Month 1 if orgs are small |
| 10 | **Major** | Audit retention policy + auto-purge scheduler | **D-168** | Month 1: GDPR Art. 5(1)(e) storage limitation |

Honourable mentions (not in top 10): **D-154** (repository tenant-filter ratchet), **D-156** (M365 auto-provision), **D-163** (PublicHoliday region scoping), **D-169** (BI export endpoints), **D-171** (customization breadth +5).

---

## 5. Acceptance check

| Acceptance criterion | Status |
|---|---|
| All 11 sub-areas (a–k) addressed | ✅ |
| ≥10 must-fix items ranked | ✅ (10 ranked + 5 honourable mentions) |
| Day-1 / Week-1 / Month-1 timeline filled out (≥3 rows per bucket) | ✅ (Day-1: 5, Week-1: 5, Month-1: 7) |
| File:line citations throughout | ✅ |
| Cross-reference table for tracker items | ✅ (§3) |
| New D-IDs minted only when no existing item covers | ✅ (19 new; D-153..D-171) |
| Unanswered questions left UNCLEAR rather than guessed | ✅ (e.g., D-157 SCIM is DECIDE, not "ship") |

---

## 6. Tracker append plan (D-153..D-171)

To be appended, on user approval, under a new sub-heading `### Phase 9 — Real-organization readiness (docs/planning/real-org-readiness-gap.md)` inside `## Research Findings (D-85+)`. Final list (verdict tags follow Phase 8 conventions):

| New D-id | Verdict | Title | Source |
|---|---|---|---|
| **D-153** | [SECURITY] | Tenant-scoping gap on notification suite + IdempotencyKey + IntegrationSyncState (80 of 105 models lack `tenantId`) | §2(a) |
| **D-154** | [SECURITY] | Repository where-clause tenant-filter ratchet (sample of 8-12 repos shows tenantId not enforced even where column exists) | §2(a) |
| **D-155** | [BLOCKER] | SSO OIDC implementation gap (`sso.*` settings + `openid-client` dep wired, no `/auth/oidc/*` handler) | §2(h) |
| **D-156** | [SCALE] | M365 reconciliation auto-provision gap (read-only directory pull; no Person auto-create) | §2(h) |
| **D-157** | [DECIDE] | SCIM 2.0 server stub for IdP-driven user lifecycle | §2(h) |
| **D-158** | [SECURITY] | Extend ResponsibilityRule to read endpoints (extends D-130; covers 330 `@RequireRoles` on `@Get`) | §2(b) |
| **D-159** | [DECIDE] | Tenant role redefinition admin UI (custom roles + role-permission overrides) | §2(b) |
| **D-160** | [BLOCKER] | Fiscal calendar entity + period-aware financial rollups (`financial.repository.ts:216-217` ignores `general.fiscalYearStart`) | §2(c) |
| **D-161** | [LOCALE] | Tenant timezone + weekStartDay propagation (parameterize `getMondayOfWeek`; consume `general.timezone`/`timesheets.weekStartDay`) | §2(c)(e) |
| **D-162** | [LOCALE] | Org seed depth shallow vs real-org pattern (Region/Country layer missing in `it-company` profile) — schema fine, seed gap only | §2(c) |
| **D-163** | [LOCALE] | PublicHoliday tenant/region scoping (currently `countryCode @default("AU")` global) | §2(c) |
| **D-164** | [BLOCKER] | FxRate model + multi-currency consolidation in capitalisation/budget reports | §2(d) |
| **D-165** | [LOCALE] | Frontend currency formatter wiring + `date-fns-tz` adoption (FE hardcodes `Intl.NumberFormat('en-US', USD)`) | §2(d)(e) |
| **D-166** | [DATA] | Bulk-import scope expansion: Project/OrgUnit/Skill/RateCard + XLSX + ImportBatch model + transactional rollback | §2(f) |
| **D-167** | [COMPLIANCE] | GDPR right-to-erasure endpoint + AuditLog redaction strategy | §2(g) |
| **D-168** | [COMPLIANCE] | AuditLog retention policy + automated purge | §2(g) |
| **D-169** | [SCALE] | Reporting CSV/XLSX export endpoints + cursor pagination + `modifiedSince` filter | §2(k) |
| **D-170** | [DOC] | Webhook event-type registry + schema documentation | §2(k) |
| **D-171** | [CUSTOM] | Customization breadth +5 (extends D-122..D-132): per-project SLA, per-skill weights, per-org allocation ceiling, per-workflow timesheet lock, industry presets | §2(i) |

(19 items minted at D-153..D-171.)
