---
area: "Custom Integration API Builder (self-serve connector / mapping framework as a separate module)"
effort: XL
---

# Custom Integration API Builder (self-serve connector / mapping framework as a separate module)

**Effort:** XL

## Current state

No connector-builder module exists today; the capability is ABSENT as a product, but unusually strong reusable scaffolding is already shipped. Grounded inventory:

FULLY-BUILT / REUSABLE PRIMITIVES
- Generic adapter port: `src/shared/integration/integration-adapter-port.ts` (`IntegrationAdapterPort<TCommand,TResult>` with execute() + getProviderName()). This is the seam every existing adapter targets.
- Uniform adapter registry (the closest existing analog to a "builder hub"): `src/modules/admin/application/integrations-registry.service.ts` + `src/modules/admin/presentation/integrations-registry-admin.controller.ts` (GET `/api/admin/integrations/registry`, POST `:provider/test-connection`) + FE `frontend/src/routes/admin/IntegrationsRegistryPage.tsx`. Hardcoded 6-provider enum (jira/m365/radius/jsm/ldap/llm) — not dynamic/tenant-defined.
- LLM scaffold proving the pluggable-client + probe pattern: `src/shared/llm/llm-client.ts`, `openai-compatible-client.ts`, `llm.module.ts` (configured via env; `probe()` returns configured/reachable/latencyMs).
- Outbound webhook bus: `src/modules/admin/infrastructure/in-memory-webhook.service.ts` — HMAC-SHA256 signed POST, per-event filter, 10s timeout, delivery log; endpoints in `src/modules/admin/presentation/admin-config.controller.ts` (POST/GET/DELETE `/api/admin/webhooks`, `/webhooks/event-types`, `/webhooks/:id/test`, `/:id/deliveries`). FE `frontend/src/lib/api/webhooks.ts`. CAVEAT: in-memory (lost on restart), outbound-only, flag `adminWebhooks` default OFF, flag description literally says "currently in-memory; not production-grade".
- Internal event registry (candidate trigger catalog): `src/shared/events/webhook-event-types.ts` — 60+ typed domain events (`WEBHOOK_EVENT_TYPES`) with prose descriptions + `WEBHOOK_EVENT_REGISTRY`.
- DB-backed at-least-once transport (the real production dispatcher): `OutboxEvent` Prisma model + `src/modules/audit-observability/application/outbox-event-publisher.service.ts` (polls, retries w/ exponential backoff + jitter, bounded attempts, metrics, `flag.outboxEnabled` default ON). This is the production-grade engine a connector dispatcher should ride on rather than the in-memory webhook service.
- Field-mapping embryo: `src/modules/integrations/hris/application/hris-sync.service.ts` already carries `fieldMapping: Record<string,string>` + `HrisConfig` in-memory; HRIS adapter port at `hris-adapter.port.ts` (BambooHR/Workday adapters under `infrastructure/adapters/`). Proves the mapping concept but is in-memory and never persists to Person.
- Generic sync ledger Prisma model: `IntegrationSyncState` (provider, resourceType, scopeKey, lastCursor, lastSyncedAt, lastStatus, lastError, actor-audit cols) — reusable per-connector run-state table.
- SSRF guard ready for outbound calls: `src/shared/validators/safe-url.validator.ts` (`SafeUrlConstraint` — https-only, blocks private/loopback/metadata ranges).
- JSON-definition customization precedent: `WorkflowDefinition` and `CustomFieldDefinition` Prisma models store `definition Json?` / `validationSchema Json?` — proves the team already persists tenant-authored definitions as JSON (flags `workflowDefinitions`/`customFields`, both scaffolded/OFF).
- Flag + admin plumbing: `src/shared/config/platform-flags.service.ts` (PLATFORM_FLAGS registry, per-tenant override, FORCE_ALL_FLAGS_ON), FE mirror `frontend/src/lib/feature-flags.ts`, admin route group `admin-integrations` in `frontend/src/app/route-manifest.ts`.

PARTIAL / FLAGGED-OFF
- Webhooks (`adminWebhooks` default OFF, in-memory). Webhook registry (`integrationsWebhookRegistry` OFF). HRIS (`adminHris` OFF, no Person upsert). Bulk import (`adminBulkImport` OFF) — only inbound-data precedent.

ABSENT (net-new for this ask)
- Tenant-defined Connector definitions (no `Connector*` Prisma models — grep for connectorDefinition/ConnectorBuilder returns nothing in app code).
- Auth-scheme credential vault (API key / OAuth2 client-credentials+authcode / Basic) with encryption-at-rest; today every adapter reads secrets from env (LDAP_BIND_*, JSM_*, LLM_*), not a per-tenant store.
- Visual field-mapping + transform UI / transform DSL (only the in-memory HRIS string map exists).
- Schedule/trigger engine binding internal events OR cron to a connector action (outbox + event registry exist but aren't bindable by operators).
- Sandbox / dry-run test-run harness for a built connector.
- Per-connector run audit + replay (generic `IntegrationSyncState` + `AuditLog` exist but no connector-run timeline).
- Inbound connector (receive external webhook → map → upsert DC entity). All current webhook code is outbound.

## Gaps

- No Connector Prisma aggregate: a tenant-authored connector definition (transport config + auth ref + field mapping + trigger) is not modelable today
- No secrets vault: credentials live in env per-adapter (LDAP_*, JSM_*, LLM_*); a builder needs per-tenant encrypted credential storage with rotation and redaction in API responses
- Field mapping is in-memory only (HRIS fieldMapping) and never persisted nor applied to a target entity; no transform layer (rename/coalesce/format/lookup/const)
- Outbound webhook service is in-memory + not production-grade; the production transport is the Outbox publisher, but it is not operator-bindable to arbitrary external endpoints
- No trigger binding: 60+ internal events exist in WEBHOOK_EVENT_TYPES and an outbox exists, but operators cannot wire 'on event X / on schedule → call connector Y'
- No sandbox/dry-run: operators cannot test-fire a connector against sample data before going live (only per-provider hardcoded probes exist)
- No inbound path: there is no generic 'receive external POST → validate signature → map → upsert DC entity' receiver; bulk import is CSV-only and flagged off
- Registry is a hardcoded 6-provider enum, not a dynamic list of tenant-built connectors
- No run-history/observability surface per connector (no connector-run timeline, no replay of a failed run)
- No rate-limiting / circuit-breaking / idempotency on outbound calls beyond the outbox's generic backoff
- No JSON-Schema validation of inbound/outbound payloads despite json-schema-registry existing in shared/persistence
- CIS-specific: no 1C (1С:Предприятие) connector template, and SSRF guard is https-only which can block on-prem bank endpoints (http/self-signed) that a generic builder must support under an allowlist

## Product definition

JOB-TO-BE-DONE: "When my bank runs a system DeliveryCentral doesn't natively integrate with (1C HRIS, an internal core-banking REST API, an on-prem ITSM, a data lake), I want to wire it up myself through a guided UI — define the endpoint, pick how it authenticates, map its fields to/from DeliveryCentral, choose when it fires, test it safely, and watch it run — without filing a feature request or waiting for a vendor release." Outcome: operator self-service integration; vendor stops being the bottleneck; each new system is days not a sprint.

PRIMARY PERSONA — Integration Operator / Bank IT engineer (admin role). Comfortable with REST + JSON, not a DeliveryCentral developer. Needs: connection config, auth, mapping, schedule, a Test button, and a run log. Reads Russian; works against on-prem endpoints over the bank LAN (often http + self-signed inside the perimeter).
SECONDARY — Platform Admin / Security: must see what's wired, what credentials exist (redacted), what each connector can read/write, and a tamper-evident audit of every run. Approves/enables connectors.
TERTIARY — Anthropic-style internal eng: wants the builder to ride existing seams (adapter port, outbox, registry) so it's maintainable, not a parallel stack.

USER VALUE: (1) Time-to-integrate collapses from a release cycle to an afternoon. (2) No code in the operator's hands = lower blast radius than letting banks fork the backend. (3) Reuses the bank's existing auth (OAuth2/Kerberos-fronted gateways/API keys). (4) Differentiator in CIS tenders where 1C and bespoke core-banking APIs are table stakes.

MINIMAL VIABLE SCOPE (MVP = outbound REST connector builder):
1) ConnectorDefinition Prisma aggregate (transport: base URL + method + headers template; trigger: one of the 60 internal events OR cron; mapping: ordered transform rules DC-field → external-field with rename/const/format/coalesce; enabled flag; tenant-scoped).
2) Credential vault: ConnectorCredential (type apiKey|basic|oauth2ClientCredentials; secret encrypted at rest; never returned in GET — redacted to last-4).
3) Mapping/transform engine: pure function (sourcePayload, mappingRules) → targetPayload; deterministic, unit-testable; no eval (whitelisted transform ops only).
4) Dispatch on the Outbox (not the in-memory webhook service): event fires → outbox row → ConnectorDispatchHandler resolves matching connectors → maps → SafeUrl-guarded fetch with auth → records ConnectorRun.
5) Sandbox: POST `.../test-run` with a sample payload → runs mapping + (optional) live call in dry-run, returns rendered request + response WITHOUT recording a real run.
6) ConnectorRun audit table + FE run timeline (status, latency, request/response snapshot, replay button).
7) FE wizard under `/admin/integrations/connectors` (List-Detail + Create/Edit-Form grammar): Define → Auth → Map (two-column field picker) → Trigger → Test → Save.
8) One seeded template: 1C HRIS outbound (employee push) to prove CIS fit.

EXPLICITLY OUT of MVP (phase 2+): inbound receiver, OAuth2 auth-code/3-legged, GraphQL/SOAP transports, visual drag-drop mapping, JSONPath extraction from nested arrays, marketplace of shared templates, Kerberos/mTLS to on-prem.

## Recommendation

Build a NEW `integration-builder` backend module + `/admin/integrations/connectors` FE surface, deliberately riding the existing seams (adapter port, OutboxEvent publisher, IntegrationSyncState pattern, SafeUrl guard, PlatformFlags). Do NOT extend the in-memory webhook service or the hardcoded registry enum — both are dead-ends. Gate everything behind a new `integrationBuilder` flag (default OFF), promote per-tenant after soak.

OPTION ANALYSIS:
- Option A (RECOMMENDED) — Outbound-first connector builder on the Outbox: ConnectorDefinition + ConnectorCredential + ConnectorRun Prisma models; a ConnectorDispatchHandler registered with the existing OutboxEventHandlerRegistry; a pure transform engine; FE wizard. Trade-off: outbound-only at first (no inbound), but it reuses the production transport (retries/backoff/observability already built), is the smallest safe surface, and covers the top CIS jobs (push DC events to 1C/core-banking/ITSM). Effort L.
- Option B — Generalize the in-memory webhook service into a DB-backed subscription store first, then layer mapping. Trade-off: you'd still rebuild on the outbox later (webhook service is explicitly 'not production-grade'); duplicates the outbox's retry logic. Reject.
- Option C — Full bidirectional iPaaS (inbound receiver + visual mapper + OAuth dance + marketplace) up front. Trade-off: XL, high security surface (inbound SSRF/authz, secret handling), 3-4x the MVP; wrong first bet for a single-tenant bank install. Defer to phases 3-4.

PHASING:
- Phase 1 (S-M, foundation): ConnectorDefinition/ConnectorCredential/ConnectorRun Prisma models + migration; module skeleton; encrypted-credential service (reuse env-derived key); CRUD controller with admin RBAC + SafeUrl validation; flag `integrationBuilder` OFF. Verify: tsc clean + unit tests on credential redaction.
- Phase 2 (M, engine): pure transform/mapping engine (whitelisted ops, no eval) + JSON-Schema validation via existing json-schema-registry; ConnectorDispatchHandler wired to OutboxEventHandlerRegistry so the 60 existing events become triggers; cron-trigger via the existing scheduler pattern. Verify: golden-file mapping tests; an event end-to-end fires a recorded ConnectorRun.
- Phase 3 (M, operator UX): FE wizard `/admin/integrations/connectors` (List-Detail + Create/Edit-Form grammars, DataTable/SectionCard/StatusBadge primitives); two-column field-mapping picker; `test-run` sandbox endpoint + 'Test' button (UX Law 7/8 one-screen); ConnectorRun timeline + replay. Add connector card to IntegrationsRegistryPage. Verify: vitest component tests; manual click-through admin role.
- Phase 4 (M, CIS proof): seed a 1C HRIS outbound template; relax SafeUrl to an admin-managed on-prem allowlist (http/self-signed inside perimeter) gated separately; Russian labels. Verify: 1C template test-run renders correct OData/HTTP body.
- Phase 5 (L, inbound — separate epic): generic inbound receiver (signed POST → validate → map → upsert DC entity), OAuth2 auth-code, GraphQL/SOAP transports. Only after Phase 1-4 soak.

Sequence rationale: each phase ships independently behind the flag; Phase 1-2 are backend-testable with no UI risk; Phase 3 is the operator value unlock; Phase 4 wins CIS deals; Phase 5 is the genuinely hard/risky half and is correctly last.

## Dependencies

- OutboxEvent + OutboxEventPublisherService + OutboxEventHandlerRegistry (flag.outboxEnabled, default ON) — the production dispatch transport the connector engine must ride
- WEBHOOK_EVENT_TYPES / WEBHOOK_EVENT_REGISTRY (src/shared/events/webhook-event-types.ts) — the trigger catalog for event-driven connectors
- SafeUrlConstraint (src/shared/validators/safe-url.validator.ts) — outbound SSRF guard; needs an admin allowlist extension for on-prem http endpoints
- PlatformFlagsService + PLATFORM_FLAGS registry + FE feature-flags mirror — new integrationBuilder flag must be added in both and kept in sync (scripts/check-flags.cjs)
- IntegrationAdapterPort + IntegrationsRegistryService/page — registry surface to extend with dynamic tenant connectors
- Encryption key management for the credential vault (no per-tenant KMS exists today; needs an env-derived key + rotation story, security-eng sign-off)
- json-schema-registry (src/shared/persistence) — payload validation for mappings
- Prisma migration discipline (idempotent migrations, DM-R-13 SHA refresh via npm run test:migrations:gen) per repo rules
- AuditLog (tamper-evident chain) — connector runs should emit audit entries for bank governance
- Admin route-manifest (admin-integrations group) + DS primitives (DataTable/SectionCard/StatusBadge/PageContainer) for the FE wizard
- Backend scheduler pattern (used by OutboxEventPublisher/SLA sweep) for cron-triggered connectors

## Risks

- Security blast radius: a self-serve outbound-call builder is an SSRF + data-exfiltration vector. Must enforce SafeUrl + admin allowlist + per-connector field-allowlist (what DC data a connector may read) + mandatory security review before flag promotion.
- Credential storage: no per-tenant secrets vault exists; rolling a bespoke encryption layer risks weak crypto / key-rotation gaps. Mitigate with a reviewed envelope-encryption design and redaction-by-default in all API responses.
- Transform engine code-execution temptation: operators will want arbitrary expressions; allowing eval/JS is an RCE. Constrain to a whitelisted transform-op set (rename/const/format/coalesce/lookup) — no eval.
- On-prem reality vs SafeUrl: bank LAN endpoints are often http + self-signed + private IPs, which the current https-only guard blocks. Relaxing it is itself a security risk — needs a separate, narrowly-scoped allowlist mechanism, not a blanket bypass.
- Scope creep to full iPaaS: inbound + OAuth-dance + visual mapper + marketplace can balloon to XL+. Hard-gate MVP to outbound REST or it never ships.
- Riding the wrong transport: building on the in-memory webhook service (which the codebase itself flags 'not production-grade') would require a rewrite onto the outbox later. Commit to the outbox from day one.
- 1C/CIS specifics underestimated: 1С:Предприятие OData/HTTP semantics and Cyrillic field handling may need a dedicated adapter, not just config; validate the 1C template early (Phase 4) to de-risk the CIS claim.
- Tenant isolation: connector definitions + credentials + runs must be tenant-scoped even though multiTenant flag is OFF today (single-tenant bank installs) — design the schema with tenantId now to avoid a later migration.
- Idempotency / duplicate fires: event→connector dispatch over an at-least-once outbox can double-call external systems; needs an idempotency key on ConnectorRun + downstream-safe semantics.
- Operator error → noisy external systems: a bad mapping firing on a high-frequency event (e.g. assignment.status_changed) could hammer a downstream; needs per-connector rate-limit + circuit-breaker + a kill switch.

## Claude Design prompt

```
Design the admin UI for a "Custom Integration Connector Builder" in DeliveryCentral, a bank-grade resource-management platform. Audience: a bank IT integration operator (admin role), reads Russian and English. Match the existing DeliveryCentral design system: dark-capable tokens only (var(--color-surface), var(--color-border), var(--color-text), var(--color-status-active|warning|danger|neutral), var(--space-*)), shared primitives DataTable (variant="compact"), SectionCard, StatusBadge (dot/chip), PageContainer, PageHeader, Button, EmptyState/ErrorState/LoadingState. No raw hex. Tabular-nums on numeric columns. Follow two page grammars: (A) List-Detail Workflow for the connectors list at /admin/integrations/connectors — left a DataTable of connectors (Name, Target system, Trigger [event/schedule], Auth type as StatusBadge chip, Status dot, Last run relative time, Go), each row a Link; top-right "New connector" button; filters persisted in URL. (B) Create/Edit Form as a 5-step wizard for building/editing a connector: Step 1 Define (display name, target base URL with inline SSRF/allowlist validation, HTTP method, static headers key-value editor); Step 2 Authentication (radio: API key / Basic / OAuth2 client-credentials; credential fields that show "•••• last4" once saved, never the secret); Step 3 Field Mapping (two-column mapper — left = DeliveryCentral source fields for the chosen trigger event, right = external target field name, plus a per-row transform dropdown: none/rename/constant/format-date/coalesce; add/remove rows; live JSON preview of the rendered outbound body); Step 4 Trigger (radio: On event [searchable dropdown of ~60 domain events grouped by domain] OR On schedule [cron picker]); Step 5 Test & Save (a "Test run" panel: paste/sample payload → shows rendered request + simulated/live response side by side on ONE screen per UX Law 7, no scrolling to reach the Save/Test buttons; success/error StatusBadge). Plus a Connector Detail page with a Run History timeline (DataTable: time, trigger, status dot, latency ms right-aligned, HTTP status, Replay button) and a Danger-zone disable/delete using ConfirmDialog. Every screen must have a forward action (UX Law 2) and keep the operator in-context after save (UX Law 3, success toast with "View runs" / "Add another"). Show empty, loading, and error states for the list and run history.
```

---

# Custom Integration API Builder — Product Discovery & BA Analysis

_Area owner: separate `integration-builder` module. Target market: CIS / Uzbekistan banks (agentic.uz). Prepared as a hand-off to engineering._

## 1. Current state (code-grounded)

The capability — a self-serve, no-code connector/mapping framework — **does not exist as a product**. But the platform already ships an unusually strong set of seams that a connector builder should ride rather than reinvent. Everything below is verified in code.

### Reusable, fully-built primitives
| Primitive | Path | Why it matters |
|---|---|---|
| Generic adapter port | `src/shared/integration/integration-adapter-port.ts` | `IntegrationAdapterPort<TCommand,TResult>` — the seam every adapter targets. A built connector is "just another adapter". |
| Adapter registry (closest analog to a builder hub) | `src/modules/admin/application/integrations-registry.service.ts`, controller `…/presentation/integrations-registry-admin.controller.ts`, FE `frontend/src/routes/admin/IntegrationsRegistryPage.tsx` | Uniform status/probe view. **But the provider list is a hardcoded enum** (`jira\|m365\|radius\|jsm\|ldap\|llm`) — not dynamic. |
| LLM scaffold (pluggable-client + probe pattern) | `src/shared/llm/llm-client.ts`, `openai-compatible-client.ts`, `llm.module.ts` | Template for "config-driven client with a `probe()`" — exactly the shape a connector needs. |
| Outbound webhook bus | `src/modules/admin/infrastructure/in-memory-webhook.service.ts`; endpoints in `src/modules/admin/presentation/admin-config.controller.ts` (`/api/admin/webhooks*`) | HMAC-signed POST, per-event filter, delivery log. **CAVEAT: in-memory, outbound-only; flag `adminWebhooks` default OFF; its own flag description says "currently in-memory; not production-grade".** Do not build on this. |
| Internal event registry (trigger catalog) | `src/shared/events/webhook-event-types.ts` | 60+ typed domain events (`WEBHOOK_EVENT_TYPES`, `WEBHOOK_EVENT_REGISTRY`) with descriptions — the trigger menu for event-driven connectors. |
| **Production dispatch transport** | `OutboxEvent` Prisma model + `src/modules/audit-observability/application/outbox-event-publisher.service.ts` + `outbox-event-handler-registry.ts` | At-least-once, retries w/ exponential backoff + jitter, bounded attempts, metrics, backlog gauge. `flag.outboxEnabled` default **ON**. **This is the engine the connector dispatcher must use.** |
| Field-mapping embryo | `src/modules/integrations/hris/application/hris-sync.service.ts` (`fieldMapping: Record<string,string>`, `HrisConfig`), port `hris-adapter.port.ts` | Proves mapping concept — but in-memory, never persisted, never applied to `Person`. |
| Generic sync ledger model | `IntegrationSyncState` (provider, resourceType, scopeKey, lastCursor, lastSyncedAt, lastStatus, lastError, actor-audit) | Reusable per-connector run-state shape. |
| SSRF guard | `src/shared/validators/safe-url.validator.ts` (`SafeUrlConstraint`) | https-only, blocks private/loopback/metadata ranges. Ready for outbound calls; needs an on-prem allowlist extension. |
| JSON-definition customization precedent | `WorkflowDefinition.definition Json?`, `CustomFieldDefinition.validationSchema Json?` | The team already persists tenant-authored definitions as JSON. Flags `workflowDefinitions`/`customFields` (scaffolded, OFF). |
| Flag + admin plumbing | `src/shared/config/platform-flags.service.ts` (`PLATFORM_FLAGS`), FE mirror `frontend/src/lib/feature-flags.ts`, route group `admin-integrations` in `frontend/src/app/route-manifest.ts` | New flag + admin route slot in well-trodden patterns. |

### Partial / flagged-off
- **Webhooks** — in-memory, `adminWebhooks` OFF. Webhook registry `integrationsWebhookRegistry` OFF.
- **HRIS** — `adminHris` OFF; never upserts to `Person`; BambooHR/Workday only (no 1C — see CIS gap).
- **Bulk import** — `adminBulkImport` OFF; only inbound-data precedent (CSV).

### Absent (the net-new for this ask)
Tenant-defined **Connector definitions**; an **auth-scheme credential vault** (today every adapter reads env: `LDAP_BIND_*`, `JSM_*`, `LLM_*`); a **visual field-mapping + transform** layer; an operator-bindable **trigger/schedule engine** over connectors; a **sandbox/dry-run** harness; a **per-connector run audit + replay**; and any **inbound** receiver (all webhook code is outbound).

Prior integration work (Sprint F-3..F-9, see `docs/planning` + memory `project-sprint-f-4-closed.md`) delivered the discrete adapters (M365 D-156, OIDC D-155, Jira PPM filter, JSM Cloud, LDAP/AD F-4.7) and the LLM scaffold (F-4.1) — i.e. the *vertical* connectors, plus the *horizontal* seams above. The builder is the missing horizontal that lets operators add verticals themselves.

## 2. Gaps
1. **No `Connector*` Prisma aggregate** — a tenant-authored connector (transport + auth ref + mapping + trigger) is not modelable.
2. **No secrets vault** — credentials live in env per-adapter; a builder needs per-tenant encrypted storage + rotation + redaction.
3. **Mapping is in-memory only** and never applied to a target; **no transform layer** (rename/const/format/coalesce/lookup).
4. **Outbound webhook service is in-memory + "not production-grade"**; the production transport (outbox) isn't operator-bindable to arbitrary endpoints.
5. **No trigger binding** — 60+ events + an outbox exist, but operators can't wire "on event X / on cron → call connector Y".
6. **No sandbox/dry-run** — can't test-fire before going live.
7. **No inbound path** — no generic "receive external POST → validate → map → upsert DC entity"; bulk import is CSV-only and OFF.
8. **Registry is a hardcoded enum**, not a dynamic list of tenant connectors.
9. **No per-connector run history / replay**, no rate-limit / circuit-breaker / idempotency, no JSON-Schema payload validation (despite `json-schema-registry` existing).
10. **CIS-specific**: no **1C (1С:Предприятие)** template; SSRF guard is https-only and will block on-prem bank endpoints (http/self-signed/private IP).

## 3. Product definition
**Job-to-be-done:** _"When my bank runs a system DeliveryCentral doesn't natively integrate with (1C HRIS, internal core-banking REST, on-prem ITSM, a data lake), I want to wire it up myself through a guided UI — define the endpoint, pick how it authenticates, map its fields to/from DeliveryCentral, choose when it fires, test it safely, and watch it run — without filing a feature request."_

**Personas**
- **Integration Operator / Bank IT engineer (admin)** — REST+JSON literate, not a DC developer; works against bank-LAN endpoints (often http + self-signed); reads Russian. Primary.
- **Platform Admin / Security** — must see what's wired, which credentials exist (redacted), what each connector can read/write, and a tamper-evident run audit; approves/enables. Secondary.
- **DC platform engineer** — wants the builder on existing seams (adapter port, outbox, registry), not a parallel stack. Tertiary.

**User value:** time-to-integrate drops from a release cycle to an afternoon; no operator code = smaller blast radius than letting banks fork the backend; reuses the bank's own auth; CIS tender differentiator (1C + bespoke core-banking APIs are table stakes).

**Minimal viable scope (MVP = outbound REST connector builder)**
1. `ConnectorDefinition` aggregate (transport: base URL/method/header template; trigger: one internal event OR cron; mapping: ordered transform rules; enabled; tenant-scoped).
2. `ConnectorCredential` vault (apiKey | basic | oauth2-client-credentials; encrypted at rest; redacted to last-4 in responses).
3. Pure mapping/transform engine — whitelisted ops only (rename/const/format/coalesce/lookup), **no eval**, deterministic, unit-testable.
4. Dispatch on the **Outbox**: event → outbox row → `ConnectorDispatchHandler` resolves matching connectors → maps → SafeUrl-guarded fetch with auth → records a `ConnectorRun`.
5. **Sandbox** `…/test-run`: sample payload → renders request + (optional) live response, **records no real run**.
6. `ConnectorRun` audit + FE run timeline (status, latency, request/response snapshot, replay).
7. FE wizard `/admin/integrations/connectors` (List-Detail + Create/Edit-Form): Define → Auth → Map → Trigger → Test → Save.
8. One seeded **1C HRIS outbound** template to prove CIS fit.

**Out of MVP (later phases):** inbound receiver, OAuth2 auth-code/3-legged, GraphQL/SOAP, drag-drop mapper, JSONPath over nested arrays, shared-template marketplace, Kerberos/mTLS to on-prem.

## 4. Options & trade-offs
| Option | Description | Trade-off | Verdict |
|---|---|---|---|
| **A. Outbound-first on the Outbox** | New `integration-builder` module; `ConnectorDefinition`/`ConnectorCredential`/`ConnectorRun` models; `ConnectorDispatchHandler` in `OutboxEventHandlerRegistry`; pure transform engine; FE wizard | Outbound-only at first, but reuses production transport (retries/backoff/observability already built), smallest safe surface, covers top CIS jobs | **RECOMMENDED** (L) |
| B. Generalize webhook service first | DB-back the in-memory subscription store, then add mapping | Webhook service is explicitly "not production-grade"; you'd rebuild on the outbox later; duplicates retry logic | Reject |
| C. Full bidirectional iPaaS up front | Inbound receiver + visual mapper + OAuth dance + marketplace | XL+, high security surface (inbound SSRF/authz, secrets), 3-4x MVP; wrong first bet for single-tenant bank installs | Defer to phases 3-5 |

## 5. Recommendation & phased plan
Build a **new `integration-builder` backend module** + `/admin/integrations/connectors` FE surface, riding existing seams. **Do not** extend the in-memory webhook service or the hardcoded registry enum. Gate behind a new `integrationBuilder` flag (default OFF); promote per-tenant after soak.

- **Phase 1 — Foundation (S-M).** `ConnectorDefinition`/`ConnectorCredential`/`ConnectorRun` Prisma models + idempotent migration (refresh DM-R-13 SHA via `npm run test:migrations:gen`); module skeleton; envelope-encrypted credential service; admin-RBAC CRUD controller with `SafeUrl` validation; flag OFF. _Verify: tsc clean; unit tests on credential redaction._
- **Phase 2 — Engine (M).** Pure transform/mapping engine (whitelisted ops, no eval) + JSON-Schema validation via `json-schema-registry`; `ConnectorDispatchHandler` wired into `OutboxEventHandlerRegistry` so the 60 events become triggers; cron trigger via the existing scheduler pattern. _Verify: golden-file mapping tests; one event → recorded `ConnectorRun` end-to-end._
- **Phase 3 — Operator UX (M).** FE wizard (List-Detail + Create/Edit-Form grammars; DataTable/SectionCard/StatusBadge/PageContainer); two-column field-mapping picker; `test-run` sandbox + Test button (UX Law 7/8 one-screen); `ConnectorRun` timeline + replay; connector card on `IntegrationsRegistryPage`. _Verify: vitest component tests; manual admin click-through._
- **Phase 4 — CIS proof (M).** Seed 1C HRIS outbound template; admin-managed on-prem allowlist (http/self-signed inside perimeter), gated separately from `SafeUrl`; Russian labels. _Verify: 1C template test-run renders correct OData/HTTP body._
- **Phase 5 — Inbound (L, separate epic).** Generic inbound receiver (signed POST → validate → map → upsert); OAuth2 auth-code; GraphQL/SOAP. Only after 1-4 soak.

Each phase ships independently behind the flag; 1-2 are backend-testable with no UI risk; 3 is the value unlock; 4 wins CIS deals; 5 is the genuinely hard/risky half — correctly last.

## 6. Effort, dependencies, risks
**Effort:** XL overall (MVP phases 1-4 ≈ L; inbound phase 5 ≈ L on its own).

**Key dependencies:** OutboxEvent + publisher + handler registry; `WEBHOOK_EVENT_TYPES`; `SafeUrlConstraint` (+ allowlist ext); `PlatformFlagsService`/FE mirror (new `integrationBuilder` flag, keep in sync via `check-flags.cjs`); adapter port + registry; **a credential-encryption key strategy (none exists today — security-eng sign-off)**; `json-schema-registry`; idempotent-migration + DM-R-13 discipline; `AuditLog` chain; admin route-manifest + DS primitives; backend scheduler pattern.

**Top risks:** SSRF/data-exfiltration from a self-serve outbound caller (mitigate: SafeUrl + admin allowlist + per-connector field-allowlist + mandatory security review before promotion); bespoke credential crypto (mitigate: reviewed envelope encryption + redaction-by-default); transform-engine RCE temptation (whitelist ops, no eval); on-prem http/self-signed vs https-only guard (narrow allowlist, not a blanket bypass); scope creep to full iPaaS (hard-gate MVP); riding the wrong transport (commit to the outbox); 1C/Cyrillic specifics under-estimated (validate template early); tenant isolation (schema with `tenantId` now even though multi-tenant flag is OFF); at-least-once double-fire (idempotency key on `ConnectorRun`); noisy downstream from a bad mapping on a high-frequency event (per-connector rate-limit + circuit-breaker + kill switch).

## 7. Suggested new artifacts (concrete)
- **Prisma:** `ConnectorDefinition` (id, tenantId, name, targetUrl, httpMethod, headersTemplate Json, triggerKind enum[EVENT|CRON], triggerEvent String?, cronExpr String?, mapping Json, enabled, actor-audit) · `ConnectorCredential` (id, connectorId, authType enum, encryptedSecret, last4, rotatedAt) · `ConnectorRun` (id, connectorId, triggeredBy, status enum, httpStatus, latencyMs, requestSnapshot Json, responseSnapshot Json, idempotencyKey, createdAt).
- **Backend module:** `src/modules/integration-builder/` (application: connector CRUD service, transform engine, dispatch handler, test-run service; infrastructure: encrypted-credential repo, prisma repos, outbound-fetch client reusing `SafeUrlConstraint`; presentation: `connector.controller.ts` under `/api/admin/integrations/connectors`).
- **Frontend:** `frontend/src/routes/admin/connectors/` (List, Detail, Wizard), `frontend/src/lib/api/connectors.ts`, new route entries in `route-manifest.ts` (group `admin-integrations`, `ADMIN_ONLY_ROLES`), flag `integrationBuilder` in both flag registries.
