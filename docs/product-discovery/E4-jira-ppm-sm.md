---
area: "Jira PPM / Jira SM (JSM) Integration"
effort: L
---

# Jira PPM / Jira SM (JSM) Integration

**Effort:** L

## Current state

Jira/JSM exists as scaffolding with one real HTTP client (JSM create-issue) that is wired to nothing. Three sub-capabilities:

1) Jira PPM project sync — PARTIAL/STUB. `JiraProjectSyncService` (src/modules/integrations/jira/application/jira-project-sync.service.ts) is a complete, correct sync algorithm (dedupe, link, archive/discover/update events, sync-state). It writes to Prisma: JiraModule (jira.module.ts) injects InMemoryProjectRepository/InMemoryProjectExternalLinkRepository/InMemoryExternalSyncStateRepository tokens, which ProjectRegistryModule (project-registry.module.ts:114-131) aliases to PrismaProjectRepository/PrismaProjectExternalLinkRepository/PrismaExternalSyncStateRepository. BUT the SOURCE is `InMemoryJiraProjectAdapter` (in-memory-jira-project.adapter.ts) constructed with an empty array (jira.module.ts:22-24) — there is NO real Jira REST client. So `POST /api/integrations/jira/projects/sync` runs end-to-end against zero source projects. Controller (jira-integrations.controller.ts) exposes sync, retry-sync, reset-sync, test-connection, status — all admin-only, all audited. `test-connection` just calls `fetchProjects()` on the empty in-memory adapter (always "reachable"). `JiraStatusService.getStatus()` hardcodes `status:'configured'` (jira-status.service.ts:19).

2) Jira SM (JSM) case sync — PARTIAL/FLAGGED-OFF, dead-ended. `JsmCloudAdapter` (src/shared/jsm/jsm-cloud-adapter.ts) is a REAL Atlassian Cloud REST v3 client: createIssue → POST /rest/api/3/issue with ADF body + `dc-case:` label back-reference; probe → GET /rest/api/3/myself; env-driven (JSM_BASE_URL/JSM_API_EMAIL/JSM_API_TOKEN/JSM_PROJECT_KEY). Provided globally via JSM_CONNECTOR token (jsm.module.ts). Gated by flag.feature.integrations.jsm.enabled (default OFF, maturity 'developing', platform-flags.service.ts:702). CRITICAL GAPS: (a) the only consumer of JSM_CONNECTOR is IntegrationsRegistryService (integrations-registry.service.ts:71) for the admin probe — NOTHING calls createIssue. (b) CreateCaseService (case-management/application/create-case.service.ts) for EMPLOYEE_ISSUE cases only fires a `caseCreated` notification; it never calls JSM. (c) CaseRecord (prisma/schema.prisma:1252) has NO external-linkage columns (no externalProvider/externalIssueKey/externalIssueUrl/externalState), so even a successful createIssue couldn't be persisted/displayed. (d) No inbound webhook endpoint exists. (e) The DataCenter (PAT) adapter the connector contract promises (jsm-connector.ts) was never built — Cloud-only.

3) Issue/work-item sync — ABSENT (project-level only). `JiraWorkEvidenceAdapter` is a 1-method stub returning provider name (jira-work-evidence-adapter.ts); `InMemoryJiraWorkEvidenceAdapter` only feeds the status flag `supportsWorkEvidence`. No service imports Jira worklogs/issues into WorkEvidence. Seed (prisma/seeds/it-company-profile.ts:1033,1077,1100) creates static `provider:'jira'` WorkEvidence + ProjectExternalLink rows directly in Prisma — these are fixtures, never produced by live sync.

Supporting surface that IS built: `GET /api/integrations/history` (integration-sync-history.controller.ts), admin registry `IntegrationsRegistryService.list()` (jira/m365/radius/jsm/ldap/llm). Frontend: ProjectsPage 'Jira PPM' source filter (F-4.3, frontend/src/routes/projects/ProjectsPage.tsx:120) — a client-side filter on externalLinks, not a sync. IntegrationsAdminPage with Trigger/Retry/Reset/Test buttons (frontend/src/routes/admin/IntegrationsAdminPage.tsx). IntegrationsRegistryPage at /admin/integrations/registry. ReportIssueModal (frontend/src/components/employee/ReportIssueModal.tsx) → POST /api/cases caseTypeKey EMPLOYEE_ISSUE (internal-only; its own comment admits JSM round-trip awaits flag-flip). Both registry/admin routes are flagged `obsoleteInV2:true` in route-manifest.ts.

## Gaps

- No real Jira REST/HTTP client: InMemoryJiraProjectAdapter (empty array) is the only source adapter; project sync fetches nothing in production. Needs an HttpJiraPpmAdapter (Cloud REST v3 + DC) with token/OAuth auth, pagination, rate-limit handling.
- JSM createIssue is never invoked: CreateCaseService for EMPLOYEE_ISSUE does not call JSM_CONNECTOR. The 'case.created -> JSM ticket' outbox subscription promised in jsm-connector.ts and F-4 closeout was never built.
- CaseRecord schema has no external-linkage columns (externalProvider/externalIssueKey/externalIssueUrl/externalState/lastSyncedAt). Outbound JSM tickets cannot be persisted or deep-linked from the case detail page.
- No inbound JSM webhook (POST /api/integrations/jsm/webhook): no bidirectional state sync (JSM status -> Case status), no signature validation. Cases never reflect agent resolution in JSM.
- No JSM Data Center / Server adapter (PAT auth). Contract anticipates 'datacenter' deployment but only JsmCloudAdapter exists. CIS/Uzbek banks are predominantly self-hosted (DC/Server) -> Cloud-only is a market blocker.
- No Jira issue / work-item sync: JiraWorkEvidenceAdapter is a naming stub. No import of Jira worklogs or issues into WorkEvidence, so planned-vs-actual and CAPEX evidence from Jira is unreachable except via static seed rows.
- JiraStatusService.getStatus() hardcodes status:'configured' and test-connection probes an empty in-memory adapter — admin observability is cosmetic, not a real reachability/health signal.
- No connection configuration persistence: Jira creds have NO storage path at all; JSM creds are env-only (JSM_* vars), not PlatformSettings, so per-tenant/multi-instance config and the Setup Wizard cannot manage them.
- No scheduled sync: project sync is manual-trigger only; no cron/outbox-driven incremental sync. Jira/JSM data drifts between manual runs.
- Project-origin not stamped: synced projects are not tagged source='jira-ppm' on the Project row (only a ProjectExternalLink is created); the bank-it-deployment-runbook.md:152 acceptance test ('>=5 Project rows with source=jira-ppm') cannot pass.
- Both admin integration routes are flagged obsoleteInV2:true with no V2 replacement surface identified — integrations have no home in the target (V2) UI.

## Product definition

JTBD: "As a bank PMO/IT-ops lead, when my delivery work already lives in Jira (PPM projects, dev worklogs) and my employee/IT requests live in Jira Service Management, I want DeliveryCentral to mirror that data automatically so DeliveryCentral is the single resource/capacity/governance source of truth without double data entry, and so employee-reported issues become trackable JSM tickets with status flowing back."

Personas & value:
- Admin / Integrations engineer: configure a Jira/JSM connection once (Cloud OR self-hosted DC), validate reachability, schedule sync, see real health. Value: trustworthy, auditable connectors that survive a bank security review.
- PMO / Delivery Manager: see Jira PPM projects auto-appear as DeliveryCentral projects with live external deep-links; staff/cost them here. Value: no manual project re-keying; portfolio completeness.
- Resource/Finance: ingest Jira worklogs as WorkEvidence to drive planned-vs-actual and CAPEX classification. Value: actuals without manual timesheets.
- Employee + HR/IT ops: file an issue in DeliveryCentral that becomes a real JSM ticket, with the JSM key/URL shown on the case and JSM resolution flowing back to close the DeliveryCentral case. Value: one front door, full traceability.

Minimal viable scope (close the 80% with the least surface):
1. HttpJiraPpmAdapter (real Cloud REST v3 client) behind the existing JiraProjectAdapter interface + PlatformSettings-backed connection config + project-origin stamping (source='jira-ppm'). This makes the already-complete sync pipeline actually do something.
2. JSM outbound: subscribe EMPLOYEE_ISSUE case.created to JSM_CONNECTOR.createIssue via the existing outbox (flag.outboxEnabled is ON), add CaseRecord external-linkage columns, surface the JSM key/URL on the case detail page.
3. JSM inbound webhook for status round-trip (Case status follows JSM transitions).
Defer: Jira issue/work-item sync into WorkEvidence; JSM DataCenter adapter (until a DC bank signs); bidirectional project writes.

## Recommendation

Treat this as "finish the wiring, don't rebuild." The hard domain logic (sync algorithm, JSM REST client, registry, audit, flags) already exists; the gaps are integration seams. Sequence in 4 phases, smallest-risk first, each independently shippable behind the existing flags:

Phase 1 (M) — Make Jira PPM sync real. Build HttpJiraPpmAdapter implementing the existing JiraProjectAdapter interface (Cloud REST v3: GET /rest/api/3/project/search with pagination + rate-limit/backoff). Move connection config (base URL, auth) to PlatformSettings (integrations.jira.*) so the Setup Wizard/admin can manage it; keep env fallback. Wire JiraModule to select Http vs InMemory adapter by config presence. Stamp source='jira-ppm' on created Project rows. Replace JiraStatusService hardcoded 'configured' with a real reachability probe. Verify: bank-it-deployment-runbook acceptance (>=5 Project rows source=jira-ppm) passes against a sandbox Jira.

Phase 2 (M) — JSM outbound (the highest-value, lowest-risk close). Add migration: CaseRecord.externalProvider/externalIssueKey/externalIssueUrl/externalState/externalSyncedAt (idempotent, nullable). Subscribe EMPLOYEE_ISSUE case.created in the outbox/NotificationEventTranslator path to JSM_CONNECTOR.createIssue; persist returned key/url on the case. Surface a 'View in JSM' badge on case detail (closes known follow-up). Flip flag.feature.integrations.jsm.enabled per-tenant. Verify: creating an EMPLOYEE_ISSUE with JSM configured produces a JSM ticket and a deep-link on the case.

Phase 3 (M) — JSM inbound round-trip. Add POST /api/integrations/jsm/webhook with HMAC/signature validation; map JSM transition -> Case status; update externalState. Verify: transitioning the JSM ticket closes/updates the DeliveryCentral case.

Phase 4 (L) — Jira issue/worklog -> WorkEvidence import + JSM DataCenter adapter. Build the real JiraWorkEvidenceAdapter (GET worklogs, normalize to WorkEvidence with JIRA_WORKLOG type + WorkEvidenceLink) and a JsmDataCenterAdapter (PAT auth) selected by integrations.jsm.deployment. Gate Phase 4 on an actual DC-bank customer ask (CIS/Uzbek market makes DC likely — prioritize JsmDataCenterAdapter if agentic.uz pilot is self-hosted).

Cross-cutting: add a scheduled incremental sync (cron) once Phase 1 lands; give integrations a non-obsolete V2 home (both admin routes are obsoleteInV2:true today).

## Dependencies

- PlatformSettingsService (src/modules/platform-settings) for per-tenant connection config — replaces env-only JSM_* and the currently-nonexistent Jira creds store
- Outbox subsystem (flag.outboxEnabled ON, Sprint F-6) for case.created -> JSM and for scheduled/event-driven sync
- Prisma migration discipline: CaseRecord columns + DM-R-2 schema-hash refresh (npm run test:migrations:gen) and idempotent migration.sql
- ProjectRegistryModule Prisma-backed repos (already wired) — Phase 1 reuses them; Project.source column must exist/be added for origin stamping
- NotificationEventTranslatorService.integrationSyncFailed + caseCreated events (already emit) as the subscription points
- Atlassian sandbox tenant (Cloud) for Phase 1-3 verification; a self-hosted Jira/JSM DC instance for Phase 4 DC adapter (likely needed for agentic.uz / CIS banks)
- Secrets management for Jira/JSM tokens (bank security review) — bind creds never committed, consistent with LDAP_BIND_* precedent
- V2 UI surface decision: integrations admin + registry routes are flagged obsoleteInV2 — needs a target home before/with these phases

## Risks

- Cloud-only blocker for target market: CIS/Uzbek banks (agentic.uz) typically run self-hosted Jira/JSM Data Center/Server; shipping only JsmCloudAdapter + a Cloud Jira adapter may not be deployable at the actual customer. DataCenter adapters may need to move from Phase 4 to Phase 1.
- Schema migration risk: adding CaseRecord external columns is FORWARD-safe but must be idempotent and refresh DM-R-2 hash; a half-applied migration breaks staging (documented recurring failure mode).
- Silent no-op today masquerades as 'done': because sync writes to Prisma but reads an empty in-memory source, current admin UI shows green/'configured' while syncing nothing — risk of false confidence in demos and acceptance sign-off.
- JSM outbound without inbound is a half-loop: Phase 2 alone creates tickets that never close the DeliveryCentral case; ship Phase 3 close behind it or set expectations, else cases pile up OPEN.
- Webhook security: inbound JSM webhook is an unauthenticated ingress unless HMAC/signature + IP allowlist are enforced from day one — a bank-grade requirement.
- Rate limits / pagination: naive full-project fetch against a large Jira instance will hit Atlassian rate limits; needs cursor pagination + backoff or risks throttling/blocking the connector account.
- Token/secret handling under bank review: per-tenant Jira/JSM credentials must live in PlatformSettings encrypted-at-rest or a secrets store, not env or plaintext DB; mishandling fails security audit.
- obsoleteInV2 routes: building more onto admin integration pages that are flagged for removal risks rework; needs a V2 placement decision first.

---

# Jira PPM / Jira SM (JSM) Integration — Product Discovery & BA Analysis

## TL;DR
The Jira/JSM area is **scaffolding with one real HTTP client wired to nothing**. The hard parts already exist — a correct, Prisma-backed project-sync pipeline; a genuine Atlassian Cloud REST v3 JSM client; an admin registry; audit logging; feature flags. The gaps are all **integration seams**: there is no real Jira source adapter, nothing calls JSM `createIssue`, `CaseRecord` has no columns to store a JSM link, and there is no inbound webhook. Net effect: a fresh deployment shows "configured / green" integrations that sync zero data. Closing this is wiring work, not a rebuild.

---

## 1. Current State (code-grounded)

### 1.1 Jira PPM project sync — PARTIAL / STUB
- **Algorithm is complete and DB-backed.** `JiraProjectSyncService` (`src/modules/integrations/jira/application/jira-project-sync.service.ts`) handles dedupe, external-key linking, archive/discover/update event emission, and sync-state persistence.
- **It writes to Prisma.** `JiraModule` (`src/modules/integrations/jira/jira.module.ts:31-50`) injects `InMemoryProjectRepository` / `InMemoryProjectExternalLinkRepository` / `InMemoryExternalSyncStateRepository` tokens. These tokens are **aliased to Prisma implementations** by `ProjectRegistryModule` (`src/modules/project-registry/project-registry.module.ts:114-131` → `PrismaProjectRepository`, `PrismaProjectExternalLinkRepository`, `PrismaExternalSyncStateRepository`) and exported (lines 368-370). JiraModule imports ProjectRegistryModule, so the write path is real DB.
- **The SOURCE is a stub.** The adapter is `InMemoryJiraProjectAdapter` (`infrastructure/adapters/in-memory-jira-project.adapter.ts`), constructed with an **empty array** (`jira.module.ts:22-24`). There is **no real Jira REST/HTTP client** anywhere in `src/` (grep for `rest/api`/`atlassian`/`JIRA_BASE` returns only the in-memory sync service, the JSM client, and the controller). So `POST /api/integrations/jira/projects/sync` executes the full pipeline against zero source projects in production.
- **Controller** (`presentation/jira-integrations.controller.ts`): `POST projects/sync`, `POST retry-sync`, `POST reset-sync`, `POST test-connection`, `GET status` — all `@RequireRoles('admin')`, all audited via `AuditLoggerService`, with `integrationSyncFailed` notification on failure. `test-connection` just calls `fetchProjects()` on the empty in-memory adapter, so it always reports reachable.
- **Status is cosmetic.** `JiraStatusService.getStatus()` (`application/jira-status.service.ts:19`) hardcodes `status: 'configured'`. It never probes anything.
- **The "Jira PPM source filter"** referenced in F-4 is a **frontend client-side filter** on `/projects` (`frontend/src/routes/projects/ProjectsPage.tsx:120`, F-4.3 / PR #42), filtering by `externalLinks` provider — not a backend sync feature.

### 1.2 Jira SM (JSM) case sync — PARTIAL / FLAGGED-OFF, dead-ended
- **The JSM client is REAL.** `JsmCloudAdapter` (`src/shared/jsm/jsm-cloud-adapter.ts`) is a genuine Atlassian Cloud REST v3 client: `createIssue` → `POST /rest/api/3/issue` with an ADF-formatted body and a `dc-case:CASE-XXX` label back-reference; `probe` → `GET /rest/api/3/myself`. Auth is HTTP Basic `email:apiToken`. **Config is env-only**: `JSM_BASE_URL`, `JSM_API_EMAIL`, `JSM_API_TOKEN`, `JSM_PROJECT_KEY`.
- **It is provided globally** (`src/shared/jsm/jsm.module.ts`, `@Global`, `JSM_CONNECTOR` symbol → `JsmCloudAdapter`).
- **Gated OFF.** `flag.feature.integrations.jsm.enabled` default `false`, maturity `developing` (`src/shared/config/platform-flags.service.ts:702`; FE mirror `frontend/src/lib/feature-flags.ts:175`).
- **CRITICAL — nothing calls `createIssue`.** The only consumer of `JSM_CONNECTOR` is `IntegrationsRegistryService` (`src/modules/admin/application/integrations-registry.service.ts:71`) for the admin **probe** surface. The EMPLOYEE_ISSUE creation path (`src/modules/case-management/application/create-case.service.ts`) only fires a `caseCreated` notification — it never invokes JSM. The "`case.created` → JSM ticket" outbox subscription promised in the connector contract comment (`jsm-connector.ts`) and the F-4 closeout was **never built**.
- **CRITICAL — `CaseRecord` cannot store a JSM link.** `prisma/schema.prisma:1252` (`CaseRecord`) has `publicId` and `caseNumber` but **no** `externalProvider` / `externalIssueKey` / `externalIssueUrl` / `externalState`. Even a successful `createIssue` has nowhere to persist its key/URL.
- **No inbound webhook.** No `POST /api/integrations/jsm/webhook`; no signature validation; no JSM-status → Case-status round-trip.
- **Cloud-only.** The connector contract anticipates a `'datacenter'` deployment, but only `JsmCloudAdapter` exists. No PAT-auth `JsmDataCenterAdapter`.
- **FE entry point exists but is a half-loop.** `ReportIssueModal` (`frontend/src/components/employee/ReportIssueModal.tsx:46`) → `POST /api/cases` `caseTypeKey:'EMPLOYEE_ISSUE'`. Its own comment (lines 17-20) states the JSM round-trip "happens when `integrations.jsm.enabled` flips ON" — which, given the gaps above, it currently cannot.

### 1.3 Issue / work-item sync — ABSENT
- `JiraWorkEvidenceAdapter` (`application/jira-work-evidence-adapter.ts`) is a **1-method naming stub** (`getProviderName(): 'jira'`); its in-memory impl only feeds the `supportsWorkEvidence` status flag.
- No service imports Jira worklogs or issues into `WorkEvidence`.
- The `provider:'jira'` `WorkEvidence` + `ProjectExternalLink` rows in the seed (`prisma/seeds/it-company-profile.ts:1033, 1077, 1100`) are **static fixtures written directly to Prisma**, never produced by a live sync.

### 1.4 Supporting surface that IS built
- `GET /api/integrations/history` (`integrations-hub/presentation/integration-sync-history.controller.ts`).
- Admin registry `IntegrationsRegistryService.list()` aggregates jira/m365/radius/jsm/ldap/llm with a uniform shape (`integrations-registry.service.ts`).
- FE: `IntegrationsAdminPage` (Trigger/Retry/Reset/Test buttons), `IntegrationsRegistryPage` (`/admin/integrations/registry`). **Both routes are flagged `obsoleteInV2:true`** (`frontend/src/app/route-manifest.ts:345-346`).

### Classification
| Capability | Status |
|---|---|
| Jira PPM project sync pipeline (write path) | Fully-built (Prisma-backed) |
| Jira PPM source adapter (real HTTP) | **Absent** |
| Jira status/health probe | Partial (hardcoded) |
| JSM Cloud REST client | Fully-built |
| JSM create-issue invocation from cases | **Absent** |
| CaseRecord ↔ JSM linkage (schema + UI) | **Absent** |
| JSM inbound webhook / round-trip | **Absent** |
| JSM DataCenter adapter | **Absent** |
| Jira issue/worklog → WorkEvidence import | **Absent** |
| Admin registry + audit + flags | Fully-built |

---

## 2. Job-To-Be-Done & Personas
**JTBD:** *"When my delivery work already lives in Jira (PPM + worklogs) and my employee/IT requests live in JSM, I want DeliveryCentral to mirror that automatically so it becomes the single resource/capacity/governance source of truth without double entry — and so employee-reported issues become real JSM tickets with status flowing back."*

| Persona | Value |
|---|---|
| Admin / Integrations engineer | Configure a Jira/JSM connection once (Cloud or self-hosted DC), validate reachability, schedule sync, see real health — trustworthy enough to pass a bank security review. |
| PMO / Delivery Manager | Jira PPM projects auto-appear as DeliveryCentral projects with deep-links; no manual re-keying. |
| Resource / Finance | Jira worklogs land as `WorkEvidence` to drive planned-vs-actual and CAPEX. |
| Employee + HR/IT ops | File an issue here → real JSM ticket created, key/URL on the case, JSM resolution closes the case. |

---

## 3. Options & Trade-offs

**Option A — "Finish the wiring" (recommended).** Build the missing adapters/seams onto the existing pipeline. Lowest risk, fastest value, reuses correct domain logic. Trade-off: still need a real Jira sandbox and (for the target market) a DC instance to verify.

**Option B — Rip out and adopt a generic integration framework (e.g., a connector SDK).** Higher abstraction, more providers later. Trade-off: discards working, audited code; large surface; over-engineering for the actual ask (CLAUDE.md §2 simplicity). Reject.

**Option C — Ship Cloud-only fast, defer DataCenter.** Quickest to a demo. Trade-off: **likely undeployable at CIS/Uzbek (agentic.uz) banks**, which are predominantly self-hosted. Acceptable only if the first pilot is confirmed Cloud.

Recommendation: **Option A**, with DataCenter priority driven by the actual agentic.uz deployment shape.

---

## 4. Phased Action List

| Phase | Scope | Effort | Ships behind |
|---|---|---|---|
| **1** | **Make Jira PPM sync real.** `HttpJiraPpmAdapter` (Cloud REST v3 `GET /rest/api/3/project/search`, pagination + rate-limit backoff) implementing the existing `JiraProjectAdapter` interface. Move connection config to PlatformSettings `integrations.jira.*` (env fallback). Select Http vs InMemory adapter by config presence. Stamp `source='jira-ppm'` on created `Project` rows. Replace hardcoded `JiraStatusService` status with a real probe. | **M** | `flag.feature.integrations.jira.enabled` (already GA-default-on) |
| **2** | **JSM outbound (highest value / lowest risk).** Idempotent migration adding `CaseRecord.externalProvider/externalIssueKey/externalIssueUrl/externalState/externalSyncedAt`. Subscribe EMPLOYEE_ISSUE `case.created` (outbox; `flag.outboxEnabled` already ON) → `JSM_CONNECTOR.createIssue`; persist key/url. Add "View in JSM" badge on case detail. | **M** | `flag.feature.integrations.jsm.enabled` |
| **3** | **JSM inbound round-trip.** `POST /api/integrations/jsm/webhook` with HMAC/signature validation + IP allowlist; map JSM transition → Case status; update `externalState`. | **M** | same JSM flag |
| **4** | **Jira issue/worklog → WorkEvidence + JSM DataCenter.** Real `JiraWorkEvidenceAdapter` (worklogs → `WorkEvidence` `JIRA_WORKLOG` + `WorkEvidenceLink`). `JsmDataCenterAdapter` (PAT auth) selected by `integrations.jsm.deployment`. | **L** | flags + DC config |

**Cross-cutting:** add a scheduled incremental sync (cron) after Phase 1; resolve the `obsoleteInV2:true` integration routes by giving integrations a V2 home before building more onto them; refresh DM-R-2 schema hash (`npm run test:migrations:gen`) for the Phase 2 migration.

**Overall effort: L** (4 phases; Phase 4 is itself L). Phases 1-3 deliver the core JTBD.

---

## 5. Dependencies
- PlatformSettingsService (per-tenant config; replaces env-only `JSM_*` and the nonexistent Jira creds store).
- Outbox subsystem (`flag.outboxEnabled` ON) for `case.created` → JSM and event-driven sync.
- Prisma migration discipline (idempotent SQL + DM-R-2 hash refresh).
- ProjectRegistryModule Prisma repos (reused); a `Project.source` column for origin stamping.
- `NotificationEventTranslatorService` (`caseCreated`, `integrationSyncFailed`) as subscription points.
- Atlassian **Cloud sandbox** (Phases 1-3) and a **self-hosted Jira/JSM DC** instance (Phase 4 / likely agentic.uz).
- Secrets management for tokens (bank review; follow the `LDAP_BIND_*` precedent — never commit creds).
- A V2 UI placement decision (both integration admin routes are `obsoleteInV2`).

---

## 6. Risks
1. **Cloud-only is a market blocker.** CIS/Uzbek banks (agentic.uz) typically run **self-hosted Jira/JSM DC/Server**; Cloud-only may be undeployable. The DataCenter adapters may need to move from Phase 4 into Phase 1.
2. **Silent no-op masquerades as "done."** Sync writes to Prisma but reads an empty in-memory source, so the admin UI shows green/configured while syncing nothing — false confidence in demos/acceptance.
3. **Migration risk.** CaseRecord column add must be idempotent + refresh the schema hash; half-applied migrations have broken staging before.
4. **Outbound without inbound is a half-loop.** Phase 2 alone creates JSM tickets that never close the DeliveryCentral case — ship Phase 3 close behind it.
5. **Webhook security.** The inbound JSM webhook is unauthenticated ingress unless HMAC/signature + IP allowlist are enforced from day one (bank-grade requirement).
6. **Rate limits / pagination.** Naive full-project fetch will hit Atlassian throttling; needs cursor pagination + backoff.
7. **Secret handling under audit.** Per-tenant Jira/JSM creds must be encrypted-at-rest / in a secrets store, not env or plaintext DB.
8. **`obsoleteInV2` rework.** Building onto routes flagged for removal risks throwaway work — decide V2 placement first.

---

## 7. Open Questions
- Is the first agentic.uz / CIS pilot **Cloud or self-hosted (DC/Server)**? This single answer reorders Phases 1 and 4.
- Should Jira PPM sync be **read-only mirror** or eventually **bidirectional** (write DeliveryCentral changes back to Jira)? Scope assumes read-only mirror.
- Does the bank want **JSM as the system of record for employee issues** (DeliveryCentral as front door) or **DeliveryCentral as record** (JSM as fulfillment)? Determines whether inbound (Phase 3) is mandatory or optional.
- What is the V2 home for integrations admin, given both current routes are `obsoleteInV2`?

---

## 8. Key File Citations
- `src/modules/integrations/jira/application/jira-project-sync.service.ts` — sync algorithm (built, Prisma-backed).
- `src/modules/integrations/jira/jira.module.ts:22-24` — empty in-memory source adapter (the stub).
- `src/modules/integrations/jira/infrastructure/adapters/in-memory-jira-project.adapter.ts` — stub source.
- `src/modules/integrations/jira/application/jira-status.service.ts:19` — hardcoded `status:'configured'`.
- `src/modules/project-registry/project-registry.module.ts:114-131` — Prisma aliasing of the repo tokens.
- `src/shared/jsm/jsm-cloud-adapter.ts` — real JSM Cloud REST client.
- `src/shared/jsm/jsm.module.ts` / `jsm-connector.ts` — global provider + contract (DC adapter promised, not built).
- `src/modules/admin/application/integrations-registry.service.ts:71` — the ONLY JSM consumer (probe only).
- `src/modules/case-management/application/create-case.service.ts` — EMPLOYEE_ISSUE path; no JSM call.
- `prisma/schema.prisma:1252` — `CaseRecord` (no external-linkage columns).
- `src/shared/config/platform-flags.service.ts:667,702` — `integrationsJira` (GA, on), `integrationsJsm` (developing, off).
- `frontend/src/routes/projects/ProjectsPage.tsx:120` — client-side "Jira PPM" source filter.
- `frontend/src/components/employee/ReportIssueModal.tsx:46` — EMPLOYEE_ISSUE entry point.
- `frontend/src/app/route-manifest.ts:345-346` — integration admin routes flagged `obsoleteInV2`.
- `docs/planning/bank-it-deployment-runbook.md:152` — acceptance test (`>=5 Project rows source='jira-ppm'`) currently unmeetable.
