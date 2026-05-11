# Bank-IT Deployment Runbook

**Status:** Draft v0 — authored 2026-05-10 as part of the bank-IT pivot doc-revision side-job. Sections marked **[CAT-1 PENDING]** describe surfaces that exist in `NEXT_ITERATION_PLAN.md` but are not yet built; sections without that marker describe behaviour that already works today.

**Audience:** the bank-IT operator standing up a fresh DeliveryCentral install for an internal IT division.

**Companion docs:** [`current-state.md`](current-state.md), [`/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md`](/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md), [`NEXT_ITERATION_PLAN.md`](NEXT_ITERATION_PLAN.md).

---

## 0. Prerequisites

| Requirement | Detail |
|---|---|
| **Compute** | 4 vCPU / 16 GB RAM minimum for the application tier. PostgreSQL on a separate node (or RDS-equivalent) recommended. Bank firewall must allow egress to Entra ID, Jira Cloud (or DC reachability), JSM, M365 Graph, and the local-LLM endpoint if used. |
| **Database** | PostgreSQL 16 with `pg_trgm` and `pgcrypto` extensions. Connection pool size ≥ `DATABASE_POOL_LIMIT` (see §3). |
| **Storage** | Persistent volume for evidence attachments + AuditLog backups. Encryption at rest required. |
| **Identity** | Bank IdP supports OIDC (Entra ID primary; Okta / Keycloak / PingFederate compatible via config). LDAP/AD bind credentials with read-only directory access. |
| **Bank PMO source** | Jira PPM project space — read-write API token for sync. |
| **Bank ITSM** | Jira Service Management (Cloud or DC) — webhook-capable, OAuth or PAT credential. |
| **Local LLM (optional)** | Any OpenAI-compatible endpoint (Ollama / vLLM / on-prem proxy) reachable from the application tier. Not required for go-live; Cat-3 use-cases gate on it. |

---

## 1. Day-1 onboarding sequence

The full onboarding flow runs through the **Setup Wizard** at `https://<host>/setup`. Operators stand up containers, hit the URL, paste the one-time token from `docker logs`, and walk through screens. The wizard handles `CREATE DATABASE` / migration / schema-diff / seeding (CLAUDE.md §10).

Today the wizard supports the canonical flow. Bank-IT additions extend it (see §2).

### 1.1 Bring up containers

```bash
git pull
docker compose pull
docker compose up -d
docker compose logs --tail=20 backend | grep -i 'setup token'
```

### 1.2 Run the wizard

Browse to `https://<host>/setup`, paste the setup token, complete:

1. **Preflight** — DB reachability, schema state, env-var validity.
2. **Migrations** — apply pending Prisma migrations.
3. **Tenant** — name, primary contact email, **timezone**, **fiscal year start month**, **default currency**, **week start day**. **[CAT-1 LOCKED 2026-05-10:** wizard reads these settings; locale-agnostic architecture means they propagate to every locale-sensitive operation. **PENDING** the consume-side wiring (Cat-1.3 D-160a/D-161/D-163/D-165).**]**
4. **Admin** — superadmin email + password. (For OIDC-only banks, see §2.)
5. **Integrations** — **[CAT-1 PENDING]** SSO config + LDAP map + Jira PPM creds + JSM connector; admin can defer any.
6. **Monitoring** — Prom/Grafana endpoints if used.
7. **Seed** — optional. The bank-IT install typically skips the `it-company` demo seed and lets LDAP/M365 sync be the source of truth.
8. **Complete** — wizard token expires; ops banner appears post-setup.

### 1.3 Smoke checks

```bash
curl https://<host>/api/health
curl https://<host>/api/health/deep | jq '.status'
# expect: "ready"
```

---

## 2. Bank-IT-specific configuration **[CAT-1 PENDING]**

These steps complete during Cat-1 work; today the surfaces are referenced but most do not yet exist.

### 2.1 SSO (Entra ID OIDC)

1. In Entra portal: register a new application; configure redirect URI to `https://<host>/auth/oidc/callback`.
2. Issue a client secret; record tenant id + client id + secret.
3. In DeliveryCentral admin (when D-155 ships): `/admin/sso` → fill `sso.idp.name=entra`, `sso.idp.issuerUrl=https://login.microsoftonline.com/<tenantId>/v2.0`, `sso.idp.clientId=<clientId>`, `sso.idp.clientSecret=<secret>`. Click Test.
4. Toggle `sso.autoProvisionUsers=true` to allow first-login Person upsert via M365 reconciliation (D-156).

(Until D-155 ships, fall back to local-account auth via `/auth/login`.)

### 2.2 LDAP / Active Directory

1. Provide bind DN + service account password.
2. Configure base DN for users + groups.
3. Configure `ldap.groupRoleMap` — e.g. `CN=IT-Director,OU=Groups → director`, `CN=IT-PMO,OU=Groups → project_manager`, etc.
4. Schedule sync interval (default: hourly). First sync upserts Person rows.

### 2.3 Jira PPM connector

1. Create a Jira API token (Cloud) or PAT (DC).
2. Map Jira project keys → DeliveryCentral `Project.source='jira-ppm'` rows.
3. Schedule sync. Project metadata (name, status, lead) imports; assignment changes flow back to Jira.

### 2.4 JSM connector

1. Pick deployment shape: Cloud (OAuth/API token) or DC (PAT). Configure `integrations.jsm.deployment`.
2. Provide JSM project key for case routing.
3. Configure JSM webhook → `https://<host>/api/integrations/jsm/webhook` for case-state updates.
4. Test: from `/dashboard/employee` (when D-EMP-CASE ships), click "Report an issue" → JSM ticket appears with the matching case-id back-reference.

### 2.5 Customizable + deterministic RBAC

1. Default 8 platform roles ship (admin / director / hr_manager / resource_manager / project_manager / delivery_manager / employee / dual-role).
2. **[CAT-1 PENDING D-159 admin UI behind `flag.admin.rolePermissionUI.enabled`]** Visit `/admin/roles` → add bank-specific roles (Squad Lead, Tribe Lead, IT Service Owner, Business Stakeholder).
3. Each role's read + write rules are explicit (no implicit grants). Verify via the determinism guard CI test.
4. **[CAT-1 PENDING D-158]** Read endpoints honour ResponsibilityRule under `flag.rbac.responsibilityRule.reads.enabled` (default OFF for 30-day soak before flipping on).

### 2.6 Local-LLM scaffolding (optional)

```bash
LLM_ENDPOINT=http://localhost:11434/v1   # Ollama default; any OpenAI-compatible endpoint
LLM_API_KEY=                             # blank for Ollama
LLM_MODEL=llama3.1:8b
```

Health probe at `/api/health/deep` reports LLM connectivity. No use-cases wired yet — Cat-3 features (case classification, staffing match suggestions) gate on this.

---

## 3. Operational settings (recommended for bank-IT)

| Setting | Default | Recommended |
|---|---|---|
| `DATABASE_POOL_LIMIT` | unset (~9 at 4 vCPU) | 25–50 (see Cat-1 D-143) |
| `general.timezone` | `Australia/Sydney` | bank-specific (e.g. `Europe/London`) |
| `general.currency` | `USD` | bank-specific |
| `general.fiscalYearStart` | `01-01` | bank-specific (e.g. `04-01`) |
| `timesheets.weekStartDay` | `monday` | usually `monday` |
| `audit.retentionDays` | unset (indefinite) | jurisdictional (e.g. 7 years for EU/UK; **Cat-1.8 D-168** wires the auto-purge) |
| `flag.tenancy.multiTenant.enabled` | `false` | `false` (single-tenant per-bank) |
| `flag.financial.multiCurrency.enabled` | `false` | `true` if multi-country bank; `false` for single-currency |
| `flag.helpCenter.enabled` | `true` | `false` until bank-branded content review complete |
| `flag.pulse.enabled` | `false` | leave `false` until HR/Compliance signs off |
| `flag.rbac.responsibilityRule.reads.enabled` | `false` | `false` for first 30 days; flip on after staging soak |

---

## 4. GDPR + retention

**[CAT-1 LOCKED 2026-05-10: redact-payload v1 strategy]**

| Concern | Implementation |
|---|---|
| Right-to-erasure | `POST /admin/persons/:id/forget` → redact `payload.email` + `payload.actorDisplayName` to `[redacted]` while preserving hash chain (Cat-1.8 D-167). |
| Audit retention | `audit.retentionDays` setting + nightly auto-purge cron (Cat-1.8 D-168). |
| Cryptographic forgetting v2 | Cat-3 future capability for high-bar customers. |
| Soft-delete | `archivedAt` is the live column; `deletedAt` declared dead weight (Cat-1.8 D-96). |

---

## 5. Integration test — bank-IT canary

Once Cat-1 + Cat-2 land, run this end-to-end smoke before declaring go-live:

1. Configure SSO → "Test connection" green.
2. Configure LDAP → "Test sync" → ≥10 Person rows pulled with manager hierarchy.
3. Configure Jira PPM → schedule run → ≥5 Project rows with `source='jira-ppm'`.
4. Configure JSM connector → from employee dashboard, file a test issue → JSM ticket created → webhook back updates `Case.externalState`.
5. Set fiscal year + currency + timezone → all dashboards re-render with correct currency formatting and Monday-aligned weeks.
6. Log in as employee → see assignments → submit timesheet → request leave → file Report-an-issue → see it in /cases for self → see it in JSM (if configured).
7. Log in as RM/PM/DM → see lean dashboards (no broken zeros, no silent RBAC errors) → approve a case → approve a budget change → lock a period → review audit log.
8. `/admin/feature-flags` shows all 12 flags in declared default state.
9. Load test against 200-person + 50-project seed → DM/PM/RM dashboard P95 < 1 s.
10. File a test erasure request → AuditLog `payload.email` redacted; hash chain validates.

---

## 6. Tooling references

- Setup wizard rationale: `memory/project-setup-wizard.md`
- Pipeline shape: `memory/project-seeding-flow.md`
- Migration recovery: `memory/reference-staging-migration-recovery.md`
- IT-Company test accounts: `current-state.md` §3
- Feature flag service: HD-12 in `MASTER_TRACKER.md`
- Outbox seam: HD-7 in `MASTER_TRACKER.md`
- Bank-IT plan: `/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md`

---

_End of bank-it-deployment-runbook.md (v0 draft)._
