# Sprint F-4 — Bank-landscape Integrations (PO/BA decomposition)

**Sprint window:** 2026-05-13 → +8 days
**Theme:** make DeliveryCentral pluggable for a bank's IT landscape — OIDC/Entra, LDAP/AD, JSM, Jira PPM, local-LLM scaffold. Each adapter ships with an in-memory test path + a mock-server integration-test harness, so future bank-side connections are a config flip rather than a code change.

## Sprint Goal

Each bank-IT integration surface has a pluggable adapter contract behind a single `IntegrationAdapter` interface, registered through an `/admin/integrations/registry` page, and verifiable end-to-end against containerised mock servers (no real-credential access required in dev). C1-EMP-CASE (employee "Report an issue" → JSM ticket) — the only integration-blocked story deferred from F-3 — closes here.

## Personas

| Persona | Email | Primary surface |
|---|---|---|
| Admin | admin@deliverycentral.local | `/admin/integrations/{registry,sso,ldap,jira,jsm,llm}` |
| Director Noah | noah.bennett@itco.local | Triggers + monitors integration sync runs |
| HR Diana | diana.walsh@itco.local | M365 directory reconciliation view |
| Employee Ethan | ethan.brooks@itco.local | "Report an issue" modal on `/dashboard/employee` + `/my-time` (F-4.4) |
| External user (test) | OIDC mock | Logs in via Entra mock |

## Sprint backlog — user stories

Each story = one PR per the strict CI/CD-green rule. 7 stories + 1 closeout.

| # | Story | Plan ref | Est |
|---|---|---|---|
| F-4.1 | IntegrationAdapter framework + registry page | NEW C1-INT-FRAMEWORK | 1d |
| F-4.2 | OIDC login + M365 directory adapter | D-155 + D-156 | 2d |
| F-4.3 | LDAP / AD directory adapter | NEW C1-LDAP | 1d |
| F-4.4 | JSM connector + EMP-CASE Report-an-issue flow | NEW C1-JSM + C1-EMP-CASE | 1d |
| F-4.5 | Jira PPM connector (promote from stub) | NEW C1-JIRA-PPM | 1d |
| F-4.6 | Local-LLM scaffold | NEW C1-LLM-SCAFFOLD | 1d |
| F-4.7 | Internal walk + wire Shadow CI | gate + F-2.5 carryover | 1d |
| F-4.8 | Sprint closeout (toggle flips + tracker + memory) | — | 1d |

---

## Story details

### F-4.1 — IntegrationAdapter framework + registry page (NEW C1-INT-FRAMEWORK)

**User story.** As an admin, I want a single registry page that lists every integration adapter installed in this build, with last-sync state and a manual retry action, so I can troubleshoot bank-side integrations without diving into logs.

**Acceptance criteria.**

1. New typed `IntegrationAdapter` interface in `src/modules/integrations-hub/domain/integration-adapter.ts` with: `key: string`, `displayName: string`, `kind: 'AUTH' | 'DIRECTORY' | 'PPM' | 'ITSM' | 'LLM'`, `runSync(): Promise<SyncResult>`, `getLastSyncState(): Promise<SyncState>`.
2. New `IntegrationAdapterRegistry` provider — adapters self-register on module init via `INTEGRATION_ADAPTERS` multi-provider.
3. `IntegrationSyncState` Prisma model (id, adapterKey, status, lastRunAt, lastErrorMessage, recordsProcessed, recordsCreated, recordsUpdated, recordsErrored).
4. `GET /api/admin/integrations/registry` — admin only — returns `[{ key, displayName, kind, lastSyncState, isEnabled }]`.
5. `POST /api/admin/integrations/:key/sync` — admin triggers a sync; returns the new state.
6. FE `/admin/integrations` page lists adapters in a table with: name, kind, last-sync (timestamp + status badge), record counts, "Run sync" button.
7. `data-jtbd="Which integrations are alive?"` on the page.

**DoD.**

- BE TS clean.
- New migration `20260513_int_sync_state` for `IntegrationSyncState`.
- DM-R-13 contract spec regenerated (`npm run test:migrations:gen`).
- FE TS clean + tests for the registry page.
- PR per strict CI/CD rule.

**Critical files.**

- `src/modules/integrations-hub/domain/integration-adapter.ts` (new)
- `src/modules/integrations-hub/application/integration-adapter-registry.service.ts` (new)
- `src/modules/integrations-hub/presentation/integrations-admin.controller.ts` (new or extend)
- `prisma/schema.prisma` + `prisma/migrations/20260513_int_sync_state/migration.sql`
- `frontend/src/routes/admin/IntegrationsRegistryPage.tsx` (new)
- `frontend/src/lib/api/integrations-registry.ts` (new)

**Risks.** New migration must be additive + idempotent (`CREATE TABLE IF NOT EXISTS`). Pre-commit `migrations:check` will classify; DM-R-29 (FORWARD_ONLY two-person rule) likely auto-bypasses since this is purely additive.

---

### F-4.2 — OIDC login + M365 directory adapter (D-155 + D-156)

**User story 4.2a (D-155 OIDC login).** As a bank-IT user, I want to log in with my corporate Entra identity instead of a username + password, so I don't manage another credential.

**Acceptance criteria 4.2a.**

1. New routes `GET /api/auth/oidc/login` + `GET /api/auth/oidc/callback` using `openid-client@6.8.2` (already installed).
2. Configuration via PlatformSettings: `sso.idp.issuerUrl`, `sso.idp.clientId`, `sso.idp.clientSecret` (secret redacted in GET response per the prior secrets-rule).
3. On callback: verify ID token signature + issuer + audience, extract `oid`/`sub`, upsert or look up `Person` row, mint a DC session JWT, redirect to `/dashboard/...` via `getDashboardPath`.
4. Flag `flag.feature.auth.oidc.enabled` (default OFF; flipped ON after smoke).
5. End-to-end test against the in-memory mock OIDC server in `tests/integrations/mock-oidc/`.

**User story 4.2b (D-156 M365 directory).** As an admin, I want M365 directory sync to auto-provision Person rows from the bank's Entra tenant, so new joiners appear in DeliveryCentral without manual setup.

**Acceptance criteria 4.2b.**

1. Promote `M365DirectoryAdapter` to a first-class `IntegrationAdapter` (F-4.1 contract).
2. `runSync()` pulls users from `https://graph.microsoft.com/v1.0/users` via Graph SDK (mock-server in dev) — creates new Person rows for unrecognised oids, updates `displayName/primaryEmail/grade/role` for known oids, marks departed users with `archivedAt`.
3. Configurable via PlatformSettings: `sso.autoProvisionUsers` (default true), `sso.archiveOnDeparture` (default true).
4. Reconciliation summary page renders New/Updated/Disabled counts.
5. Settings: `flag.feature.integrations.m365.enabled` flipped ON after smoke.

**Critical files.**

- `src/modules/auth/presentation/oidc.controller.ts` (new)
- `src/modules/auth/application/oidc-login.service.ts` (new)
- `src/modules/auth/application/oidc-callback.service.ts` (new)
- `src/modules/integrations-hub/infrastructure/m365-directory-adapter.ts` (promote from stub)
- `frontend/src/routes/admin/IntegrationsSsoPage.tsx` (new)
- `tests/integrations/mock-oidc/Dockerfile` + `docker-compose.integrations-mocks.yml` (new)

**Risks.** OIDC handler must reject `iss` mismatches and tokens older than `exp`. Add a CI test that proves the rejection paths return 401, not 500. Don't store `id_token` in the session (only the upserted PersonId + a short-lived DC JWT).

---

### F-4.3 — LDAP / AD adapter (NEW C1-LDAP)

**User story.** As an admin at a bank that uses on-prem AD instead of M365 Graph, I want LDAP user + manager + group sync, so DeliveryCentral identities mirror AD groups → platform roles automatically.

**Acceptance criteria.**

1. New `LdapDirectoryAdapter` in `src/modules/integrations-hub/infrastructure/ldap-directory-adapter.ts` implementing the F-4.1 contract.
2. Uses `ldapts@9.0.1` (lightweight pure-TS LDAP client — to be added to `package.json`).
3. Configurable: `ldap.url`, `ldap.bindDn`, `ldap.bindPassword`, `ldap.userBaseDn`, `ldap.userFilter` (default `(objectClass=person)`), `ldap.groupBaseDn`, `ldap.groupRoleMap` (JSON map: `{ "CN=DC-Admins,...": "admin", ... }`).
4. `runSync()` pulls user objects, walks the `manager` attribute to build the reporting hierarchy (writes ReportingLine rows), maps group membership to platform roles via `groupRoleMap`.
5. CI test variant uses an in-memory LDAP stub (mock-server in `tests/integrations/mock-ldap/`).
6. Flag `flag.feature.integrations.ldap.enabled` (default OFF; flipped ON post-smoke).

**Critical files.**

- `src/modules/integrations-hub/infrastructure/ldap-directory-adapter.ts` (new)
- `tests/integrations/mock-ldap/Dockerfile` + `docker-compose.integrations-mocks.yml` (extend)
- `frontend/src/routes/admin/IntegrationsLdapPage.tsx` (new)

**Risks.** LDAP bind credentials are sensitive — must be stored encrypted at rest (use the existing PlatformSetting redaction for `ldap.bindPassword`). New dependency (`ldapts`) — add to the approved-packages list in CLAUDE.md §4 and verify license (MIT).

---

### F-4.4 — JSM connector + EMP-CASE Report-an-issue (NEW C1-JSM + C1-EMP-CASE)

**User story 4.4a (C1-JSM).** As an admin in a bank that uses Jira Service Management, I want internal Cases in DeliveryCentral to round-trip with JSM tickets, so the bank's existing ITSM remains the source of truth for resolution state.

**Acceptance criteria 4.4a.**

1. `JsmConnector` interface in `src/modules/integrations-hub/domain/jsm-connector.ts`.
2. Two impls: `JsmCloudAdapter` (Atlassian Cloud OAuth + API token) + `JsmDataCenterAdapter` (Personal Access Token). Switch via `integrations.jsm.deployment` setting.
3. New Case creation triggers an outbox event → JSM connector creates a JSM ticket with case-id back-reference in the JSM issue's `external_reference` field.
4. JSM webhook (`POST /api/integrations/jsm/webhook`) updates `Case.externalState` when JSM state changes; verifies webhook signature.
5. Reverse-link: each Case detail page shows the linked JSM URL when present.

**User story 4.4b (C1-EMP-CASE).** As an employee, I want to file an internal issue from `/dashboard/employee` or `/my-time` without leaving the app, so I don't need to know about JSM at all.

**Acceptance criteria 4.4b.**

1. "Report an issue" button visible on `/dashboard/employee` and `/my-time`.
2. Click → `FormModal` with: category dropdown (HR / IT / Facilities / Other), summary (required, 200 chars), description (required, 2000 chars), optional attachment.
3. Submit → `POST /api/cases` (BE endpoint exists) with `category` + `summary` + `description`. On 200: toast "Issue reported — JSM #XXXX", modal closes.
4. New case appears on `/cases` for the user.
5. `data-jtbd="Report something that needs attention"` on the button.

**Critical files.**

- `src/modules/integrations-hub/domain/jsm-connector.ts` (new)
- `src/modules/integrations-hub/infrastructure/jsm-{cloud,data-center}-adapter.ts` (new)
- `src/modules/integrations-hub/presentation/jsm-webhook.controller.ts` (new)
- `frontend/src/components/employee/ReportIssueModal.tsx` (new)
- `frontend/src/routes/dashboard/EmployeeDashboardPage.tsx` (embed button)
- `frontend/src/routes/timesheets/MyTimePage.tsx` (embed button)

**Risks.** Webhook signature verification — bank-IT will rotate the JSM secret occasionally; surface a "Test connection" button that proves signature math works before the FE goes live. Cloud + DC differ in webhook payload shape — use a normaliser at the adapter boundary.

---

### F-4.5 — Jira PPM connector (NEW C1-JIRA-PPM)

**User story.** As a Director seeing projects in DeliveryCentral, I want bank PPM projects in Jira to round-trip with our Project entity, so I don't manually re-enter projects in two places.

**Acceptance criteria.**

1. Promote existing Jira stub to a first-class `IntegrationAdapter` (F-4.1 contract).
2. `runSync()` pulls Jira projects via Jira REST v3 (mock-server in dev) with fields: key, name, lead, status, projectTypeKey. Maps to `Project.projectCode` (Jira key), `Project.name`, `Project.projectManagerId` (via M365/LDAP Person lookup by email), `Project.status` (PPM `OPEN | ON_HOLD | DONE → ACTIVE | ON_HOLD | COMPLETED`).
3. Project tagged with `source = 'jira-ppm'` in a new column (added in F-4.1 migration if cheap).
4. Reverse-direction NOT in scope: a v1.1 follow-up if we ever want DC projects pushed into Jira.
5. Flag `flag.feature.integrations.jiraPpm.enabled` flipped ON post-smoke.

**Critical files.**

- `src/modules/integrations-hub/infrastructure/jira-ppm-adapter.ts` (new)
- `tests/integrations/mock-jira/Dockerfile` + compose extension

**Risks.** `Project.projectCode` is `@unique`. Sync logic must handle collision when a Jira key matches a DC-native projectCode — adopt an upsert that picks Jira as source-of-truth only if `source = 'jira-ppm'`.

---

### F-4.6 — Local-LLM scaffold (NEW C1-LLM-SCAFFOLD)

**User story.** As a future AI-driven-feature owner, I want a typed `LlmClient` interface backed by an OpenAI-compatible HTTP client, so any bank-side local LLM endpoint (Ollama, vLLM, LM Studio, on-prem OpenAI proxy) plugs in without rewriting the AI surface.

**Acceptance criteria.**

1. New `src/shared/llm/llm-client.ts` interface with `chat(messages, options): Promise<LlmCompletion>`.
2. New `src/shared/llm/openai-compatible-client.ts` impl that POSTs to `${LLM_ENDPOINT}/chat/completions` with optional `Bearer ${LLM_API_KEY}`.
3. Env-driven: `LLM_ENDPOINT` (e.g. `http://localhost:11434/v1`), `LLM_API_KEY` (optional), `LLM_MODEL` (e.g. `llama3.1:8b`).
4. `/api/health/deep` includes an `llm: { configured: bool, reachable: bool }` field.
5. Zero use-cases wired this sprint — this is the integration layer only.

**Critical files.**

- `src/shared/llm/llm-client.ts` (new)
- `src/shared/llm/openai-compatible-client.ts` (new)
- `src/modules/health/application/deep-health.service.ts` (extend)

**Risks.** When `LLM_ENDPOINT` is unset (typical dev), the health probe must return `configured: false, reachable: false` without hanging. Use a 1s timeout on the probe call.

---

### F-4.7 — Internal walk + wire Shadow CI

**Acceptance criteria.**

1. Internal walk as admin: visit each `/admin/integrations/{m365,ldap,jira,jsm,llm}` page, trigger sync, capture `IntegrationSyncState` row.
2. Employee Ethan files a test issue → JSM mock server creates ticket with case-id back-reference.
3. Wire `npm run verify:shadow` (deferred from F-2.5): a single npm script that runs the full vitest + jest suites with all flags forced ON via `FORCE_ALL_FLAGS_ON=1`.
4. GitHub Actions: add `shadow-ci` workflow that runs nightly at 03:00 UTC; failure pings the flag owner per `metadata.owner` field.
5. Document the new pages + adapters in `docs/runbooks/admin-runbook.md`.

---

### F-4.8 — Sprint closeout: toggle flips + tracker + memory

**Acceptance criteria.**

1. Toggles flipped to default ON: `auth.oidc`, `integrations.ldap`, `integrations.jsm`, `integrations.jiraPpm`, `llm.scaffold`.
2. Update `docs/planning/current-state.md` with F-4 outcome.
3. Write `memory/project-sprint-f-4-closed.md`.
4. Capture 1 screenshot per adapter on the registry page for the closeout PR.

---

## Cross-sprint constraints

- **CI/CD rule:** every PR pre-merge green + post-merge `build-and-stage` green + staging `/api/health/deep` `ready` before declaring story done.
- **120s monitor cadence** for all PR polls (per `feedback-poll-every-120-secs.md`).
- **Auto-merge** when pre-merge CI green (per `feedback-auto-merge-when-green.md`).
- **No new packages** without justification — `ldapts` adds a single MIT-licensed dep; needs CLAUDE.md §4 approval check.
- **No raw colors** outside design tokens.
- **No mock data** in app code — mock servers live under `tests/integrations/mock-*/`.
- **All secrets redacted** in admin GETs (the bind-password / client-secret / API-token / webhook-secret fields).

## Out of scope for F-4

- SCIM 2.0 server (Cat-3 — D-157).
- Cross-bank benchmarking (Cat-3).
- AI-driven case classification / staffing match suggestions — defer to F-5+ once LLM scaffold lands.
- Reverse-direction DC → Jira sync (defer to v1.1).
- Real bank credentials — adapters work against mock servers only this sprint.

## Sprint metrics

- 8 PRs merged + post-merge staging green
- 5 toggles flipped OFF → ON
- 1 new BE-blocking story (EMP-CASE) closed
- 0 regressions in the 23-scenario UAT
- Shadow CI passes 2 consecutive nights before any further flag is promoted to GA
