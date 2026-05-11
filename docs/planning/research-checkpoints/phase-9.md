# Phase 9 Checkpoint — Real-Organization Readiness Gap

**Run date:** 2026-05-10
**Status:** complete; awaiting user validation gate before MASTER_TRACKER append.
**Artifact:** [docs/planning/real-org-readiness-gap.md](../real-org-readiness-gap.md) — 11 sub-area sections (a–k), Day-1 / Week-1 / Month-1 breakage timeline, top-10 must-fix ranking, cross-reference table to existing tracker items, tracker append plan.

## Counts

| Metric | Target | Actual |
|---|---|---|
| Sub-areas (a–k) covered | 11 | **11** (j marked "ready" — runbooks already strong; no D-item) |
| Day-1 timeline rows | ≥3 | **5** |
| Week-1 timeline rows | ≥3 | **5** |
| Month-1 timeline rows | ≥3 | **7** |
| Top must-fix items ranked | ≥10 | **10** (+ 5 honourable mentions) |
| New D-items proposed | — | **19** (D-153..D-171) |
| Findings cross-referenced to existing tracker | — | 9 (HARDEN_BRIEF F6.1-F6.3, D-96, D-103, D-107, D-108, D-110, D-122..D-132, D-130, D-148/149) |
| Models tenant-scoped (live count) | — | 25 of 105 |
| Distinct `@RequireRoles` patterns (live count) | — | 52 patterns / 330 invocations |

## Findings summary (≤300 words)

**Tenant scoping has two layers and only one is owned.** HARDEN_BRIEF F6.1-F6.3 plans the `NOT NULL` flip + RLS enable on the **25 already-scoped models**. The remaining **80 of 105 models** are not in any plan — most importantly the notification suite (Channel/Template/Request/Delivery), `IdempotencyKey`, `IntegrationSyncState`, `PlatformSetting`. Sample of 8-12 repositories shows queries don't filter on `tenantId` even where the column exists. → **D-153, D-154**.

**SSO is shipped as settings, not as code.** `sso.*` keys + `openid-client@6.8.2` are wired, but there is no `/auth/oidc/*` route. `sso.autoProvisionUsers` has zero consumer. M365 reconciliation is read-only — does not auto-create Person rows. SCIM 2.0 server endpoints absent. → **D-155, D-156, D-157**.

**Locale is configured but inert.** `general.timezone`, `general.fiscalYearStart`, `general.currency`, `timesheets.weekStartDay` are all read into the GeneralSettings DTO but never consumed. `financial.repository.ts:216-217` hardcodes `Date.UTC(fiscalYear, 0, 1)`. `getMondayOfWeek(new Date())` runs in server UTC. Frontend hardcodes `Intl.NumberFormat('en-US', currency: 'USD')`. `date-fns-tz` is not installed. → **D-160, D-161, D-163, D-164, D-165**.

**RBAC is half-tenant-aware.** ResponsibilityRule shipped (HD-4) for 6 mutating services. The other 330 `@RequireRoles` decorators — including every `@Get` — are static lists. Tenant cannot redefine roles or define custom roles. → **D-158, D-159** (extend D-130).

**Compliance gap is regulatory.** Zero `purge|forget|gdpr` hits in `src/`. AuditLog is hash-chained, indefinite retention, never redacted. Right-to-erasure has no implementation. → **D-167, D-168**.

**Day-2 ops are genuinely strong.** 7 runbooks (665 lines), monthly PITR drill required, quarterly chaos game-day with TTD/TTC/TTR targets. **No D-item** for sub-area (j). The other gaps — bulk-import scope, BI extracts, customization breadth at scale — produce **D-166, D-169, D-170, D-171**.

## Skills invoked (host-built-in only)

- The spec's `engineering:*`/`product-management:*`/`operations:*` plugin skills are not installed; methodology was inlined.
- Local skills the audit drew on:
  - `business-analyst` — for the Day-1/Week-1/Month-1 timeline framing and "real customer expectation vs. what we ship" voice.
  - `database-architect` — for the tenant-scoping, FK-action, and effective-dating angles cross-cutting Phase 3 and Phase 9.
  - `senior-architect` — for the RBAC reads-vs-mutations split and the "ResponsibilityRule extension" framing.
  - `saas-multi-tenant` — for the 25-of-105 + repository-filter ratchet + RLS posture rubric.
  - `gdpr-data-handling` — for the hash-chain-vs-erasure conflict and the "redact payload PII vs. delete the row vs. cryptographic forgetting" decision tree.
  - `i18n-localization` — for the FxRate / tenant-timezone / weekStartDay / public-holiday locale lens.
- Subagent dispatch: 3 parallel Explore subagents (A: security/identity; B: org-structure/locale/timezone; C: lifecycle/Day-2 ops). Each returned a structured per-sub-area report with file:line evidence, verdict, and must-fix candidates. The parent synthesised the timeline + top-10 ranking + cross-reference table from the three reports.

## Tracker append plan (on user approval)

Phase 1-8 audits did NOT append to MASTER_TRACKER.md (the `## Research Findings (D-85+)` section does not yet exist; D-IDs live only in the audit docs). Phase 9 follows the same pattern: D-153..D-171 are minted **inside the audit doc** and listed below for append. **The append step itself is the question for the user** — see Validation Gate.

If the user approves the append, a new `## Research Findings (D-85+)` section will be added to the bottom of MASTER_TRACKER.md, with `### Phase 9 — Real-organization readiness (docs/planning/real-org-readiness-gap.md)` as its first sub-heading. (If the user prefers a back-fill of Phase 1-8 first, that's a separate decision — Phase 9 alone gives 19 items; back-filling phases 1-8 would add D-85..D-152, totaling ~87 items.)

| New D-id | Verdict | Title | Rationale (1 sentence) | Source |
|---|---|---|---|---|
| **D-153** | [SECURITY] | Tenant-scoping gap: notification suite + IdempotencyKey + IntegrationSyncState lack `tenantId` | 80 of 105 models not in HARDEN_BRIEF F6 scope; multi-tenant single-DB hosting leaks notification templates and idempotency keys. | audit §2(a) |
| **D-154** | [SECURITY] | Repository where-clause tenant-filter ratchet | Sample of 8-12 repositories shows `findMany`/`findFirst` calls lack `where: { tenantId }` even where the column exists; needs a Prisma middleware extension + CI lint. | audit §2(a) |
| **D-155** | [BLOCKER] | SSO OIDC implementation gap | `sso.*` settings + `openid-client@6.8.2` dep wired, but no `/auth/oidc/*` route handler in `auth.controller.ts`; `autoProvisionUsers` setting is dead code. | audit §2(h) |
| **D-156** | [SCALE] | M365 reconciliation auto-provision | `m365-directory-adapter.ts:1-38` is read-only `fetchUsers/fetchManagers/mapExternalUserToInternal`; does not create Person rows. | audit §2(h) |
| **D-157** | [DECIDE] | SCIM 2.0 server stub for IdP-driven user lifecycle | Zero `/scim/Users\|/scim/Groups` routes; no IdP-driven deprovision path. Decision: ship stub or defer until first customer asks. | audit §2(h) |
| **D-158** | [SECURITY] | Extend ResponsibilityRule to read endpoints (extends D-130) | `ResponsibilityActionKind` covers mutations only; 330 `@RequireRoles` on `@Get` cannot consume tenant rules. | audit §2(b) |
| **D-159** | [DECIDE] | Tenant role redefinition admin UI | No `RolePermissionAdminPage` in frontend; fixed list of 8 roles; tenant cannot define custom_role_X or redefine role capabilities. | audit §2(b) |
| **D-160** | [BLOCKER] | Fiscal calendar entity + period-aware financial rollups | `financial.repository.ts:216-217` hardcodes `Date.UTC(fiscalYear, 0, 1)`; `general.fiscalYearStart` setting unused; UK FY=Apr1, AU FY=Jul1 produce broken capitalisation. | audit §2(c) |
| **D-161** | [LOCALE] | Tenant timezone + weekStartDay propagation | `general.timezone` + `timesheets.weekStartDay` settings unused; `getMondayOfWeek(new Date())` uses server UTC; cross-timezone teams see misaligned week boundaries. | audit §2(c)(e) |
| **D-162** | [LOCALE] | Org seed depth shallow vs real-org pattern | `it-company` profile seeds Root → Directorate → Department (3 levels); real-org pattern needs 5 (Region/Country/BU layer). Schema fine — seed gap only. | audit §2(c) |
| **D-163** | [LOCALE] | PublicHoliday tenant/region scoping | `PublicHoliday.countryCode @default("AU")`; `public-holiday.service.ts:15` defaults to `'AU'`; multi-region tenants cannot register UK + IN holidays. | audit §2(c) |
| **D-164** | [BLOCKER] | FxRate model + multi-currency consolidation | Zero `FxRate`/`exchangeRate` in schema; `financial-governance/` sums native currencies; USD + EUR project rates produce non-comparable native-currency P&L. | audit §2(d) |
| **D-165** | [LOCALE] | Frontend currency formatter wiring + `date-fns-tz` adoption | `Intl.NumberFormat('en-US', { currency: 'USD' })` hardcoded in `BudgetCapexOpexSummary.tsx:15`; 120 raw `new Date()` calls; `date-fns-tz` not installed. | audit §2(d)(e) |
| **D-166** | [DATA] | Bulk-import scope expansion | Today: Person-only, CSV-text, sync, no rollback (`admin-config.controller.ts:222-311`). Need: Project/OrgUnit/Skill/RateCard + XLSX + ImportBatch model + transactional rollback. | audit §2(f) |
| **D-167** | [COMPLIANCE] | GDPR right-to-erasure endpoint + AuditLog redaction | Zero `purge\|forget\|gdpr` hits in `src/`; AuditLog (hash-chained, indefinite retention, payload-PII intact) conflicts with GDPR Art. 17. Decision: redact payload vs. delete row vs. cryptographic forgetting. | audit §2(g) |
| **D-168** | [COMPLIANCE] | AuditLog retention policy + auto-purge | `evidenceManagement.retentionDays` nullable; no `audit.retentionDays`; no purge cron; violates GDPR Art. 5(1)(e) storage limitation. | audit §2(g) |
| **D-169** | [SCALE] | Reporting CSV/XLSX export endpoints + cursor pagination + `modifiedSince` filter | `src/modules/reports/` has 3 GET endpoints, all JSON-only, no pagination; BI tools (Snowflake, Power BI, Tableau) cannot poll incrementally. References D-148/149. | audit §2(k) |
| **D-170** | [DOC] | Webhook event-type registry + schema documentation | `InMemoryWebhookService.dispatch(eventType: string, payload)` is unconstrained; integrators cannot self-discover the schema. | audit §2(k) |
| **D-171** | [CUSTOM] | Customization breadth +5 (extends D-122..D-132) | 5 new scaling-lens debts under realistic workload: per-project SLA profiles, per-skill matching weights, per-org allocation ceiling, per-workflow timesheet lock window, industry presets (Finance/Healthcare/Tech/Public-Sector). | audit §2(i) |

(19 items; counter ends at D-171.)

## Open questions / next-session inputs

- **Tracker append posture.** Phase 1-8 audits left their D-IDs in audit docs and never appended to MASTER_TRACKER.md. The handoff prompt assumed the section already existed; it doesn't. The user has three options at the validation gate (see Validation Gate); option-2 is "back-fill phases 1-8 at the same time" which is the clean state but a much bigger commit.
- **D-153 vs HARDEN_BRIEF F6 boundary.** F6.1-F6.3 cover the 25 already-scoped models (NOT NULL flip + RLS enable). Phase 9 D-153 covers the 80 unscoped models. If the reviewer prefers to fold D-153 under F6 as a "scope expansion" sub-task, that's also fine — but it materially expands F6's blast radius (8 → 80+ aggregates).
- **D-160 (fiscal calendar) is the most architecturally invasive Blocker.** A real implementation needs a `FiscalCalendar` model + `FiscalPeriod` rollup entity + reverse migration of `ProjectBudget.fiscalYear Int` to `FiscalPeriodId`. This is an ADR-worthy decision — proposing it as one D-item understates its scope. The user may want to split it into D-160a (consume `general.fiscalYearStart` setting in current report code — quick fix) + D-160b (FiscalCalendar + FiscalPeriod entities — Phase HD follow-up).
- **D-167 (GDPR erasure) decision tree** is non-trivial. The cleanest path is "cryptographic forgetting": rotate a per-tenant key, encrypt PII payloads with it, destroy the key on erasure. But that requires a re-key migration of every existing AuditLog row. A pragmatic shortcut is "redact `payload.actorDisplayName` + `payload.email` to `[redacted]` on erasure event"; payload still resolves but is privacy-safe. The user should pick before D-167 is implementation-scheduled.
- **D-157 (SCIM 2.0)** is the only DECIDE candidate where the recommendation is "defer until first customer asks". Listed for visibility, not because it's a near-term build.
- **Phase 10 input.** Phase 10 in the original spec is "performance + load posture validation" (different from Phase 8's static scaling-cliff projections). The Phase 9 work points at D-160 / D-161 / D-164 as the load shapes that matter most: a 5,000-person tenant computing weekly utilization across 52 weeks × 3 currencies × FY rollup is the realistic test. Phase 10 should run k6 against those queries, not against static seed.

## Exit conditions hit

- ✅ All 11 sub-areas (a–k) addressed (sub-area j marked "ready", no D-item)
- ✅ Day-1 / Week-1 / Month-1 timeline filled (5/5/7 rows)
- ✅ ≥10 must-fix items ranked (10 + 5 honourable mentions)
- ✅ File:line citations throughout
- ✅ Cross-reference table to existing tracker items (audit §3)
- ✅ New D-IDs minted only when no existing item covers (19 new; HARDEN_BRIEF F6, D-96, D-103, D-107, D-108, D-110, D-122..D-132, D-130, D-148/149 cited where they close the same gap)
- ✅ Counter advances D-152 → D-171

**Stop here.** Awaiting validation gate before tracker append.
