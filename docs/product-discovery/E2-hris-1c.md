---
area: "HRIS integration framework + 1C (1С:Предприятие) adapter for CIS / Uzbekistan banks"
effort: L
---

# HRIS integration framework + 1C (1С:Предприятие) adapter for CIS / Uzbekistan banks

**Effort:** L

## Current state

The "HRIS adapter framework" exists as a UI shell + stubbed ports, NOT a working sync engine. The mature directory-sync pattern lives in the M365 module, not HRIS.

PARTIAL / FLAGGED-OFF — HRIS framework (the surface the user saw):
- `src/modules/integrations/hris/application/hris-adapter.port.ts` — `HrisAdapterPort` interface (`adapterName`, `listEmployees()`, `getEmployee()`, `pushTermination()`) + `HrisEmployee` DTO (externalId, given/family name, email, jobTitle, departmentName, managerId, status).
- `src/modules/integrations/hris/application/hris-sync.service.ts` — `HrisSyncService`. CRITICAL: config is held in a private in-memory field (`private config: HrisConfig`), NOT persisted to PlatformSetting/DB; it resets on every pod restart. `activeAdapter: 'bamboohr' | 'workday' | 'none'`. `runSync()` line 112 comment "In a real implementation we would upsert into the person table here" — it does NOT write Person; it just counts `result.updated = employees.length`. Adapter resolution via dynamic import (lines 121-140).
- `src/modules/integrations/hris/infrastructure/adapters/bamboohr.adapter.ts` and `workday.adapter.ts` — BOTH are stubs: `listEmployees()` returns `[]` with a "(stub)" log line; `pushTermination()` logs only. No HTTP client, no real API call.
- `src/modules/integrations/hris/presentation/hris.controller.ts` — `@Controller('admin/hris')`, `@RequireRoles('admin')`, endpoints GET/POST `config`, POST `sync`, POST `test`.
- `frontend/src/routes/admin/HrisConfigPage.tsx` — the Active Adapter dropdown (None/BambooHR/Workday), Save / Run Sync / Test Connection. `frontend/src/lib/api/hris.ts` mirrors the contract.
- Feature flag `adminHris` (`src/shared/config/platform-flags.service.ts:617`, key `flag.feature.admin.hris.enabled`, **default false**, maturity beta) — description literally says "HRIS adapter (M365 covers v1; full HRIS deferred)." So the surface ships off by default and is acknowledged incomplete.

FULLY-BUILT — the real precedents to reuse:
- `src/modules/integrations/m365/application/m365-directory-sync.service.ts` — the gold-standard sync engine. Does genuine reconciliation: matches by email, links existing Person, auto-provisions new Person via `CreateEmployeeService`, resolves manager hierarchy in a second pass, emits domain events, and writes reconciliation records with categories MATCHED / UNMATCHED / AMBIGUOUS / STALE_CONFLICT. Gated on `sso.autoProvisionUsers` (D-156) so unmatched users queue for operator review instead of silent creation.
- `src/shared/ldap/ldap-directory-adapter.ts` (F-4.7) — the bind/search/map adapter precedent: `isConfigured()`, `probe()` (reachability + latency), `fetchUsers()`, attribute mapping, manager-DN + group→role map via env JSON, disabled-account detection. Config comes from env vars (LDAP_URL, LDAP_BIND_DN, etc.).
- `prisma/schema.prisma` reusable infra (NO new model needed for state/link): `PersonExternalIdentityLink` (L702) is **provider-keyed** (`@@unique([provider, externalUserId])`, `@@unique([provider, personId])`) — works for any provider incl. '1c'. `IntegrationSyncState` (L1643) is provider/resourceType/scopeKey-keyed with `lastCursor`, `lastSyncedAt`, `lastStatus`, `lastError` — reusable for 1C cursor-based delta sync.
- Target entities: `Person` (L426 — grade/role/location/timezone/employmentStatus/hiredAt/terminatedAt all present; `grade` is free-text String?), `OrgUnit` (L837 — code/name/parentOrgUnitId/managerPersonId, temporal validFrom/validTo), `PersonOrgMembership` (L914), `ReportingLine` (L943). `CreateEmployeeService` (`src/modules/organization/application/create-employee.service.ts`) is the transactional upsert entry point (Person + primary membership in one `$transaction`).
- `src/modules/admin/application/integrations-registry.service.ts` (F-8.1) — unified registry over jira/m365/radius/jsm/ldap/llm; 1C would add a 7th provider here.

ABSENT (must be built): any 1C adapter; OData/HTTP client for 1С web-services; HRIS config persistence (currently in-memory); HRIS→Person write path (the M365 path is NOT wired to the HRIS framework); HRIS scheduled sync (M365 + HRIS are manual-trigger only — `@nestjs/schedule` is used only in financial-governance, not integrations); OrgUnit/Grade/cost-rate import from HRIS; cyrillic/transliteration handling; `real-org-readiness-gap.md` confirms "Today's importer covers 1 entity of 9" (D-166) and flags HRIS-driven OrgUnit+Person+rates+skills import as a Day-1 gap.

## Gaps

- HRIS config is in-memory only (hris-sync.service.ts) — survives no restart, not multi-pod safe, secrets unencrypted-in-RAM. Must move to PlatformSetting (encrypted) before ANY real adapter ships.
- HRIS runSync() never writes Person/OrgUnit — the entire framework is a no-op counter. The working write path exists only in the M365 module and is not reachable from HRIS.
- BambooHR + Workday adapters are pure stubs returning [] — so even the 'existing' adapters are non-functional; 1C cannot 'follow their pattern' because there is no working pattern in this module.
- No OData/SOAP/HTTP web-service client for 1С:Предприятие. 1C exposes data via OData (/odata/standard.odata) or custom HTTP services (/hs/...), neither of which has any client code today.
- No org-structure (OrgUnit) sync — HrisEmployee carries only departmentName (free string); there is no department→OrgUnit upsert, no hierarchy build. 1C 'ПодразделениеОрганизаций' is hierarchical and must map to OrgUnit.parentOrgUnitId.
- No Grade mapping — Person.grade is free-text; 1C has no native 'grade', it has 'Должность' (position) + 'РазрядКатегория'. Mapping is tenant-specific and needs a config table.
- No Cyrillic / transliteration strategy — 1C names/departments are Russian/Uzbek-Cyrillic; displayName, email-derivation, and dedup-by-email all assume Latin.
- No scheduled sync — only manual 'Run Sync Now'. CIS banks expect nightly delta sync. @nestjs/schedule is not wired into any integration module.
- No conflict/reconciliation surface for HRIS (M365 has M365DirectoryReconciliationRecord + a FE panel; HRIS has none). Bank operators need a queue to resolve AMBIGUOUS/UNMATCHED 1C rows.
- Auth model undefined for 1C: 1C web-services use HTTP Basic over TLS (a dedicated service user) or, in modern infra, a reverse-proxy with token; no secret storage path exists for it.
- No termination/deactivation reconciliation — pushTermination is a stub and there is no inbound 'employee left' handling (set employmentStatus=TERMINATED, end memberships).

## Product definition

JOB-TO-BE-DONE: "As a CIS/Uzbek bank running 1С:Предприятие (1С:ЗУП / 1С:Зарплата и управление персоналом) as the system of record for employees and org structure, I want DeliveryCentral to pull employees, departments, positions, and the manager hierarchy from 1C on a schedule, so my delivery/resource data is always in sync with HR truth and I never double-enter staff."

PERSONAS:
- IT Integration Admin (bank, configures the connector once): needs Active Adapter='1C', base URL, service-user credentials, a field-mapping editor, Test Connection, and a scheduled-sync toggle. RBAC: admin.
- HR Operations Manager (resolves conflicts daily): needs a reconciliation queue (1C row → DeliveryCentral Person) for AMBIGUOUS/UNMATCHED cases, mirroring the M365 panel. RBAC: hr_manager/admin.
- Resource/Delivery Manager (consumer, indirect): benefits from accurate OrgUnit hierarchy + headcount without doing anything.

USER VALUE: eliminates manual employee entry (the readiness-gap doc's Day-1 blocker), keeps org chart and headcount KPIs truthful, and is table-stakes for selling into agentic.uz / CIS banks where 1C, not Workday/BambooHR, is the dominant HRIS.

MINIMAL VIABLE SCOPE (v1 — read-only inbound employee + department sync):
1. Persist HRIS config to PlatformSetting (encrypted secrets) — prerequisite for everything.
2. `OneCAdapter implements HrisAdapterPort` using the 1C OData endpoint (`/<base>/odata/standard.odata/Catalog_Сотрудники` or `Catalog_ФизическиеЛица` + `Catalog_ПодразделенияОрганизаций`), HTTP Basic auth, `$select`/`$filter` projection, cursor on a modification timestamp.
3. A real `runSync()` that reuses the M365 reconciliation pattern: upsert OrgUnit (department hierarchy) first, then upsert/link Person via CreateEmployeeService, link via PersonExternalIdentityLink(provider='1c'), record sync state in IntegrationSyncState, gate auto-provision on a flag.
4. Manager hierarchy second pass → ReportingLine (reuse M365's pending-resolution approach).
5. Reconciliation queue + FE panel (clone M365ReconciliationPanel) for AMBIGUOUS/UNMATCHED.
6. Nightly scheduled sync via @nestjs/schedule, behind the adminHris flag.
Explicitly OUT of v1: writing back to 1C (termination push), Grade/cost-rate/skill import, SOAP fallback, payroll fields.

## Recommendation

Build a 1C adapter ON the M365 directory-sync engine, NOT on the HRIS stub. The HRIS module is a dead shell (in-memory config, no-op sync, stub adapters); the M365 module already contains the exact reconciliation engine (match/link/auto-provision/manager-resolve/conflict-record) and reuses provider-agnostic Prisma models (PersonExternalIdentityLink, IntegrationSyncState) that key on provider string. So the right move is to generalize the M365 sync into a provider-parameterized DirectorySyncService and register '1c' as a provider, then expose it through the HRIS admin surface for UX continuity.

PHASED SEQUENCING:
- Phase 0 (prereq, S): Persist HRIS config to PlatformSetting with secret encryption; add `'1c'` to the activeAdapter union + UpdateHrisConfigRequestDto + the HrisConfigPage dropdown and a OneC settings panel (baseUrl, username, password, odataPath, scheduleCron). No behavior yet — unblocks everything and fixes the restart-loses-config defect.
- Phase 1 (M): `OneCODataAdapter` — `isConfigured()/probe()/fetchEmployees()/fetchDepartments()` against 1C OData, HTTP Basic over TLS, Cyrillic-safe mapping, cursor via `$filter` on ДатаИзменения/version. Wire Test Connection to a real probe. Use the existing `WebFetch`/undici-style http already in repo (Radius adapter is the HTTP precedent).
- Phase 2 (L): Real `runSync()` — generalize M365DirectorySyncService into a provider-agnostic engine (or a thin OneC sync service that mirrors it): upsert OrgUnit hierarchy → upsert/link Person (CreateEmployeeService) → ReportingLine manager pass → IntegrationSyncState + reconciliation records. Gate auto-provision on `sso.autoProvisionUsers` (reuse) and the adapter on `adminHris`.
- Phase 3 (M): Reconciliation queue endpoint + FE panel cloned from M365ReconciliationPanel; add '1c' to IntegrationsRegistryService (7th provider).
- Phase 4 (S): Nightly @nestjs/schedule cron, flag-gated, writing IntegrationSyncState; surface lastSyncAt in the registry card.
- Defer to v1.x: termination write-back, Grade/cost-rate/skill import (ties into D-166 bulk-import expansion), SOAP fallback.

Flip `adminHris` default to true only after Phase 3 ships and a real 1C sandbox (agentic.uz) round-trips green.

## Dependencies

- PlatformSettingsService — for encrypted, DB-backed HRIS config (replaces in-memory hris-sync.service config)
- CreateEmployeeService (src/modules/organization) — the transactional Person+membership upsert entry point
- M365DirectorySyncService + PersonExternalIdentityLink + IntegrationSyncState — the reconciliation engine + provider-keyed Prisma models to reuse/generalize
- An OrgUnit upsert service (department→OrgUnit hierarchy) — partially exists for create; needs an idempotent upsert-by-code path for 1C ПодразделенияОрганизаций
- @nestjs/schedule wired into the integrations module (currently only used in financial-governance) for nightly sync
- A reachable 1С:Предприятие OData/HTTP-service sandbox (ideally the agentic.uz target tenant) with a dedicated service user — required to validate field names, which vary by 1C configuration (типовая vs кастомная)
- sso.autoProvisionUsers flag (D-156) — reused to gate silent Person creation
- adminHris feature flag — gates the whole surface; flip to default-true only post-validation
- Secret-encryption helper used by other adapters (Jira/Workday secret fields) for the 1C service-user password

## Risks

- 1C field/entity names are NOT standardized — they depend on the bank's 1C configuration (типовая 1С:ЗУП vs heavily customized). Catalog names (Сотрудники vs ФизическиеЛица), the OData path, and which fields hold email/manager differ per tenant. Mitigation: make the field-mapping fully config-driven (the fieldMapping Record already exists in HrisConfig) and validate against the real agentic.uz tenant before committing names.
- Many 1C on-prem deployments do NOT expose the OData service publicly (it is off by default and often behind the bank's perimeter). Mitigation: support a reverse-proxy / HTTP-service (/hs/) variant and document the publishing requirement; have an LDAP/AD fallback for org structure since F-4.7 already exists.
- Email is the dedup/match key (M365 strategy='email'), but 1C frequently lacks employee email or stores it inconsistently. Risk of AMBIGUOUS/UNMATCHED floods. Mitigation: add a personNumber/ИНН/external-id match strategy in addition to email; route low-confidence rows to the reconciliation queue, never auto-create.
- Cyrillic/Uzbek-Latin transliteration: displayName, login derivation, and string dedup must be UTF-8 clean and not Latin-assume. Risk of duplicate Person rows. Mitigation: normalize on a stable externalId (1C Ref_Key GUID), not on names.
- Building on the HRIS stub instead of the M365 engine would re-implement reconciliation badly. Mitigation (chosen): generalize M365 engine; do NOT extend the stub adapters.
- In-memory config defect (current state) means any 'it works in demo' result is illusory across restarts — must fix Phase 0 first or the connector silently disarms in prod.
- Scope creep into payroll/cost-rate/grade import (1C:ЗУП holds salary). Keep v1 strictly read-only employee+department; cost rates belong to the D-166 bulk-import expansion, not this adapter.
- Compliance: bank may forbid outbound calls from DeliveryCentral into 1C without a change-advisory; confirm network direction (pull vs push) and TLS/cert pinning expectations for agentic.uz.

## Claude Design prompt

```
Design two admin screens for DeliveryCentral (dark-capable, token-based design system; reference page is the Workload Overview dashboard). (1) "HRIS Integration" config page — extend the existing Active Adapter dropdown to include a "1C (1С:Предприятие)" option; when selected, show a settings card with fields: Base URL, OData path, Service username, Service password (masked), Match strategy (email / personNumber), Auto-provision toggle, and a Schedule (nightly cron) selector; primary actions Save Configuration / Run Sync Now / Test Connection; show a Test Connection result chip (reachable + latency ms, error in red) and a last-sync summary (created/updated/linked counts + timestamp). (2) "1C Reconciliation Queue" panel — a compact DataTable of unresolved rows with columns: # / Category badge (MATCHED green, AMBIGUOUS amber, UNMATCHED grey, STALE_CONFLICT red) / External (1C name+dept, Cyrillic-safe) / Suggested Person match / Confidence / Resolve action; each row resolvable in-place (link to existing person, create new, or ignore) per UX Law 8 (one-screen exception resolution). Use kpi-strip cards at top: Total synced, Pending review, Created this run, Errors. Every KPI is a clickable drilldown (UX Law 9). Follow the existing M365ReconciliationPanel and HrisConfigPage structure and the AdminTabbedShell layout; use StatusBadge, DataTable variant=compact, SectionCard, EmptyState, ErrorState, LoadingState; no raw hex, tokens only.
```

---

# HRIS Integration Framework + 1C (1С:Предприятие) Adapter — Product Discovery & BA Analysis

## 1. Executive summary

The Admin → HRIS Integration surface (BambooHR / Workday dropdown, Save / Run Sync / Test Connection) is a **UI shell over a non-functional framework**. The HRIS module's config is held in memory, its `runSync()` is a no-op that never writes a `Person`, and both BambooHR and Workday adapters are stubs that return `[]`. The **actually-working directory-sync engine lives in the M365 module**, which already does email-matching, auto-provisioning, manager-hierarchy resolution, conflict categorization, and reuses provider-agnostic Prisma models.

**Recommendation: build the 1C adapter on the M365 engine, not on the HRIS stub.** The fastest, lowest-risk path to a working 1С:Предприятие connector is to generalize `M365DirectorySyncService` into a provider-parameterized engine, register `'1c'` as a provider (the relevant Prisma models already key on a provider string), and expose it through the familiar HRIS admin surface. Effort: **L**.

## 2. Current state (code-grounded)

### 2.1 The HRIS framework the user saw — PARTIAL / FLAGGED-OFF, effectively a stub

| Concern | File | Finding |
|---|---|---|
| Adapter port | `src/modules/integrations/hris/application/hris-adapter.port.ts` | `HrisAdapterPort` = `adapterName`, `listEmployees()`, `getEmployee()`, `pushTermination()`. `HrisEmployee` carries only `departmentName` as a free string — **no org hierarchy, no grade**. |
| Sync service | `src/modules/integrations/hris/application/hris-sync.service.ts` | Config is `private config: HrisConfig` **in memory** — lost on every restart, not multi-pod safe, secrets in plain RAM. `runSync()` line 112: `// In a real implementation we would upsert into the person table here.` — it only sets `result.updated = employees.length`. **No DB write.** |
| BambooHR adapter | `.../infrastructure/adapters/bamboohr.adapter.ts` | `listEmployees()` returns `[]` with a `(stub)` log. No HTTP client. |
| Workday adapter | `.../infrastructure/adapters/workday.adapter.ts` | Same — pure stub. |
| Controller | `.../presentation/hris.controller.ts` | `@Controller('admin/hris')`, `@RequireRoles('admin')`; GET/POST `config`, POST `sync`, POST `test`. |
| Config DTO | `.../application/contracts/update-hris-config.request.ts` | `HRIS_ADAPTER_NAMES = ['bamboohr','workday','none']`; nested optional DTOs per adapter. |
| Frontend | `frontend/src/routes/admin/HrisConfigPage.tsx`, `frontend/src/lib/api/hris.ts` | The dropdown + Save/Run Sync/Test Connection the user reported. |
| Feature flag | `src/shared/config/platform-flags.service.ts:617` | `adminHris`, key `flag.feature.admin.hris.enabled`, **default false**, description: *"HRIS adapter (M365 covers v1; full HRIS deferred)."* |

**So even the two "existing adapters" do nothing.** A 1C adapter cannot "follow the BambooHR/Workday pattern" because there is no working pattern in this module.

### 2.2 The real precedents — FULLY-BUILT, the things to reuse

| Asset | File | Why it matters for 1C |
|---|---|---|
| **M365 directory sync engine** | `src/modules/integrations/m365/application/m365-directory-sync.service.ts` | The gold standard. Matches by email; links existing `Person`; auto-provisions new `Person` via `CreateEmployeeService`; resolves manager hierarchy in a 2nd pass; emits domain events; writes reconciliation records with categories **MATCHED / UNMATCHED / AMBIGUOUS / STALE_CONFLICT**; gated on `sso.autoProvisionUsers` (D-156). This is the engine to generalize. |
| **LDAP adapter** | `src/shared/ldap/ldap-directory-adapter.ts` (F-4.7) | The bind/probe/fetch/map shape: `isConfigured()`, `probe()` (reachable + latency), `fetchUsers()`, attribute mapping, manager-DN + group→role map. Env-driven config. The blueprint for `OneCODataAdapter`. |
| **Provider-agnostic link model** | `prisma/schema.prisma:702` `PersonExternalIdentityLink` | `@@unique([provider, externalUserId])` + `@@unique([provider, personId])`. **Works for `provider='1c'` with zero schema change.** |
| **Provider-agnostic sync state** | `prisma/schema.prisma:1643` `IntegrationSyncState` | `provider/resourceType/scopeKey` + `lastCursor`, `lastSyncedAt`, `lastStatus`, `lastError`. Reusable for 1C cursor-based delta sync. |
| **Person upsert** | `src/modules/organization/application/create-employee.service.ts` | Transactional `Person` + primary `PersonOrgMembership` in one `$transaction`. The write entry point. Accepts `grade`, `role`, `skillsets`, `status`. |
| **Target entities** | `prisma/schema.prisma` | `Person` (L426: grade/role/location/timezone/employmentStatus/hiredAt/terminatedAt). `OrgUnit` (L837: code/name/parentOrgUnitId/managerPersonId, temporal). `PersonOrgMembership` (L914). `ReportingLine` (L943). |
| **Unified registry** | `src/modules/admin/application/integrations-registry.service.ts` (F-8.1) | Aggregates jira/m365/radius/jsm/ldap/llm. 1C becomes the 7th provider entry. |
| **Reconciliation FE** | `frontend/src/components/integrations/M365ReconciliationPanel.tsx` | Clone target for the 1C reconciliation queue. |

### 2.3 ABSENT — must be built
- Any 1C adapter; any OData/SOAP/HTTP-service client for 1С.
- HRIS config persistence (currently in-memory) — **prerequisite defect**.
- HRIS→Person write path (the working path is M365-only and not reachable from HRIS).
- OrgUnit/department-hierarchy import from HRIS.
- Scheduled sync (M365 and HRIS are both manual-trigger; `@nestjs/schedule` is wired only in `financial-governance`, never in integrations).
- Cyrillic/transliteration handling; Grade/cost-rate/skill import.

`docs/planning/real-org-readiness-gap.md` independently confirms this is a Day-1 gap: *"Today's importer covers 1 entity of 9"* and flags HRIS-driven OrgUnit+Person+rates+skills import (D-166) as a blocker for real-org onboarding.

## 3. Job-to-be-done, personas, value

**JTBD:** *"As a CIS/Uzbek bank running 1С:Предприятие (1С:ЗУП) as my HR system of record, I want DeliveryCentral to pull employees, departments, positions, and the manager hierarchy from 1C on a schedule, so my delivery/resource data always matches HR truth and I never double-enter staff."*

**Personas:** IT Integration Admin (configures once; needs URL/creds/field-map/Test/schedule), HR Operations Manager (resolves conflicts daily; needs a reconciliation queue), Resource/Delivery Manager (indirect consumer of accurate org + headcount).

**Value:** removes the Day-1 manual-entry blocker, keeps org chart / headcount KPIs truthful, and is **table-stakes for agentic.uz / CIS banks** where 1C — not Workday/BambooHR — is the dominant HRIS.

## 4. 1C integration surface — feasibility & architecture

### 4.1 How 1C exposes data
1С:Предприятие 8 publishes data two ways, both over HTTP(S):
- **Standard OData** — `https://<host>/<base>/odata/standard.odata/` exposing catalogs as `Catalog_<Name>` (e.g. `Catalog_Сотрудники`, `Catalog_ФизическиеЛица`, `Catalog_ПодразделенияОрганизаций`, `Catalog_Должности`). Supports `$select`, `$filter`, `$top`, `$skip`, `$format=json`. This is the v1 target.
- **Custom HTTP services** (`/<base>/hs/<service>/...`) — when the bank does not want to expose raw OData; returns a curated JSON. Support as a config variant.

**Auth:** HTTP Basic over TLS using a dedicated 1C service user (стандартный механизм); modern infra may front it with a reverse proxy + token. Store the password as an **encrypted PlatformSetting secret**, never env-committed.

**Delta/cursor:** filter on a modification marker (`ДатаИзменения` / version / `Ref_Key` ordering) persisted in `IntegrationSyncState.lastCursor`.

### 4.2 Mapping (config-driven — names vary by 1C configuration)
| DeliveryCentral | 1C source (typical 1С:ЗУП) | Notes |
|---|---|---|
| `Person.externalId` (link.externalUserId) | `Ref_Key` (GUID) | **Stable match key — never match on Cyrillic names.** |
| `Person.givenName/familyName/displayName` | `Наименование` / `ФИО` split | UTF-8/Cyrillic clean; do not Latin-assume. |
| `Person.primaryEmail` | email field (often absent) | Secondary match key only. |
| `Person.personNumber` | `Код` / `ТабельныйНомер` / ИНН | **Add as a match strategy** — email is unreliable in 1C. |
| `OrgUnit.code/name` | `Catalog_ПодразделенияОрганизаций` | Hierarchical → `OrgUnit.parentOrgUnitId`. Upsert by code first. |
| `Person.role` | `Должность` | Free text into `Person.role`. |
| Manager → `ReportingLine` | `Руководитель` / dept manager | 2nd-pass resolution (reuse M365 pending-resolution). |
| `Person.grade` | `РазрядКатегория` (optional) | Deferred to v1.x; free-text. |

The existing `HrisConfig.fieldMapping: Record<string,string>` is the right place to make these tenant-overridable.

### 4.3 Conflict handling (reuse M365 categories)
MATCHED (linked) / UNMATCHED (no internal person, no email — queue) / AMBIGUOUS (duplicate email or already-linked person — queue) / STALE_CONFLICT (previously-linked 1C row not seen this run — review for departure). Auto-provision gated on `sso.autoProvisionUsers`; low-confidence rows **never auto-create** — they land in the reconciliation queue.

## 5. Options considered

| Option | Approach | Trade-off | Verdict |
|---|---|---|---|
| **A — Extend the HRIS stub** | Implement `OneCAdapter implements HrisAdapterPort`, write the upsert in `HrisSyncService.runSync()` | Familiar surface, but re-implements reconciliation from scratch (matching, manager pass, conflict records) badly; inherits the in-memory-config defect | Reject as the engine; keep only its UI surface |
| **B — Generalize the M365 engine (recommended)** | Parameterize `M365DirectorySyncService` by provider; add `OneCODataAdapter`; reuse `PersonExternalIdentityLink`/`IntegrationSyncState`; surface via HRIS admin page | Reuses proven reconciliation + provider-agnostic models; one engine for M365/1C; minimal schema change | **Choose** |
| **C — Generic CSV/bulk-import path (D-166)** | Have 1C export CSV, import via the bulk importer | No live sync; manual; loses hierarchy; not what banks expect | Reject for primary; viable interim fallback |

## 6. Phased action list

| Phase | Scope | Effort | Gate |
|---|---|---|---|
| **0 — Config persistence (prereq)** | Move `HrisConfig` to encrypted PlatformSetting; add `'1c'` to the activeAdapter union, `UpdateHrisConfigRequestDto`, dropdown + OneC settings panel (baseUrl, odataPath, username, password, matchStrategy, scheduleCron). No behavior yet. Fixes the restart-loses-config defect. | **S** | Config survives restart |
| **1 — `OneCODataAdapter`** | `isConfigured()/probe()/fetchEmployees()/fetchDepartments()` against 1C OData; HTTP Basic over TLS; Cyrillic-safe map; cursor via `$filter`. Wire real Test Connection. (Radius adapter = HTTP precedent.) | **M** | Test Connection green against agentic.uz sandbox |
| **2 — Real `runSync()`** | Generalize M365 engine: upsert OrgUnit hierarchy → upsert/link Person via `CreateEmployeeService` → `ReportingLine` manager pass → `IntegrationSyncState` + reconciliation records. Gate auto-provision on `sso.autoProvisionUsers`, adapter on `adminHris`. | **L** | First real Person+OrgUnit rows from 1C |
| **3 — Reconciliation queue** | Endpoint + FE panel cloned from `M365ReconciliationPanel`; add `'1c'` to `IntegrationsRegistryService`. | **M** | HR can resolve AMBIGUOUS/UNMATCHED in-place |
| **4 — Scheduled sync** | Nightly `@nestjs/schedule` cron, flag-gated, writing `IntegrationSyncState`; surface `lastSyncAt` in registry card. | **S** | Nightly delta runs green |
| **Deferred (v1.x)** | Termination write-back; Grade/cost-rate/skill import (ties to D-166); SOAP/HTTP-service fallback. | — | — |

Flip `adminHris` default → true **only** after Phase 3 ships and a real 1C sandbox round-trips green.

## 7. Effort / dependencies / risks
Overall effort **L** (Phase 2 is the long pole). Key dependencies: `PlatformSettingsService`, `CreateEmployeeService`, the M365 engine + provider-agnostic models, an idempotent OrgUnit upsert-by-code, `@nestjs/schedule`, the `sso.autoProvisionUsers` + `adminHris` flags, and — critically — **a reachable 1C OData sandbox (ideally agentic.uz)** to pin down field names.

Top risks: (1) 1C entity/field names are **not standardized** — make mapping fully config-driven and validate against the real tenant; (2) many on-prem 1C deployments don't expose OData publicly — support the `/hs/` HTTP-service variant and keep LDAP (F-4.7) as an org-structure fallback; (3) **email is unreliable in 1C** — add a `personNumber`/ИНН match strategy and route low-confidence rows to the queue, never auto-create; (4) Cyrillic dedup — match on the `Ref_Key` GUID, not names; (5) the **in-memory-config defect** makes any demo result illusory across restarts — Phase 0 must land first.

## 8. Open questions
1. agentic.uz 1C: standard OData published, or only HTTP services? Which 1C config — типовая 1С:ЗУП or customized?
2. Network direction: is DeliveryCentral allowed to pull from 1C, or must 1C push? (Affects auth + scheduling.)
3. Does 1C hold reliable employee email, or must we match on табельный номер/ИНН?
4. Is v1 strictly read-only inbound, with no write-back to 1C? (Recommended yes.)
5. Should Grade/cost rates come from 1C:ЗУП now, or stay in the D-166 bulk-import track?
