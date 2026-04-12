# DeliveryCentral — Master Plan

**Owner:** Product Manager / Business Owner  
**Last updated:** 2026-04-04  
**Status:** All phases complete (2026-04-08). See current-state.md.

This document is the single source of truth for what we are building, why, and in what order.
It supersedes earlier roadmap fragments for sequencing purposes.
Domain documentation in `docs/domains/` and `docs/architecture/` remains authoritative for business rules.

---

## Product vision

An EPAM-class Delivery Central for a Bank's IT block.  
Core purpose: balance supply and demand across projects, development teams, and service teams.  
System of record for: staffing decisions, org structure, project registry, and workforce allocation.

---

## Governing principles

1. **Do not break working core functionality** — read and verify before touching
2. **No new surfaces** — deepen existing ones; every addition names the JTBD it serves
3. **Auth gates everything** — authorization layer before any UX work
4. **Bounded contexts stay sovereign** — `Team` ≠ `OrgUnit` ≠ `Project`, never collapsed
5. **Feature toggle contract** — every external dependency has an `ENABLED` env var defaulting to `false`
6. **Zero-external-dep local start** — system starts and is fully testable with no SMTP, no LDAP, no Azure AD
7. **Cloud-readiness is continuous** — every PR that changes Dockerfile/env/services updates prod counterparts
8. **Docker-only local runtime** — no changes to the dev environment model
9. **API contracts are stable** — backend contracts preserved unless breaking change is explicitly approved
10. **Every change names its JTBD** — if you cannot name the persona and job, do not build it

---

## Feature toggle contract

| Dependency | Toggle | Default | When off |
|---|---|---|---|
| Local accounts | `AUTH_LOCAL_ENABLED` | `true` | n/a — always on |
| LDAP | `AUTH_LDAP_ENABLED` | `false` | strategy not registered, no UI option |
| Azure AD | `AUTH_AZURE_AD_ENABLED` | `false` | strategy not registered, no SSO button |
| SMTP / email | `SMTP_ENABLED` | `false` | password reset link logged to console (INFO) |
| IMAP | `AUTH_IMAP_ENABLED` | `false` | config placeholder only, not wired |
| 2FA enforcement | `AUTH_2FA_ENFORCE_ROLES` | `` (empty) | 2FA optional for all in local mode |

**Minimum viable local set:** `AUTH_LOCAL_ENABLED=true`, everything else false.  
After `docker compose --profile tools run --rm seed`, login as `admin@deliverycentral.local` / `DeliveryCentral@Admin1`.

---

## Roles

| Role | Description |
|---|---|
| `employee` | Self-service: own assignments, evidence, profile |
| `project_manager` | Project lifecycle, staffing, anomaly review |
| `resource_manager` | Capacity, team management, bulk assignments |
| `hr_manager` | People governance, org structure, dictionaries |
| `delivery_manager` | Team delivery, anomaly drilldown (**new — replaces team_manager**) |
| `director` | Organisation-wide oversight |
| `admin` | Full system access, configuration, integrations |

`team_manager` never existed in code (only in planning docs). `delivery_manager` is the canonical implementation.

---

## Route permission matrix

| Route | emp | pm | rm | hr | dm | dir | adm |
|---|---|---|---|---|---|---|---|
| `/` summary | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/dashboard/planned-vs-actual` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/dashboard/employee` | self | — | — | ✓ | — | ✓ | ✓ |
| `/dashboard/project-manager` | — | ✓ | — | — | — | ✓ | ✓ |
| `/dashboard/resource-manager` | — | — | ✓ | — | — | ✓ | ✓ |
| `/dashboard/hr` | — | — | — | ✓ | — | ✓ | ✓ |
| `/dashboard/delivery-manager` | — | — | — | — | ✓ | ✓ | ✓ |
| `/org`, `/people`, `/teams` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/projects`, `/assignments`, `/work-evidence`, `/cases` | own | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/exceptions` | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/admin/audit` | — | — | — | ✓ | — | ✓ | ✓ |
| `/admin/dictionaries` | — | — | — | ✓ | — | ✓ | ✓ |
| `/admin/notifications` | — | — | — | — | — | ✓ | ✓ |
| `/integrations`, `/admin/integrations`, `/admin/monitoring` | — | — | — | — | — | ✓ | ✓ |
| `/admin` (full), `/metadata-admin` | — | — | — | — | — | — | ✓ |

**Role → dashboard redirect on login:**
`admin` → `/admin` · `director` → `/` · `hr_manager` → `/dashboard/hr` · `resource_manager` → `/dashboard/resource-manager` · `project_manager` → `/dashboard/project-manager` · `delivery_manager` → `/dashboard/delivery-manager` · `employee` → `/dashboard/employee`  
Multiple roles: highest-authority wins (admin > director > hr_manager > resource_manager > project_manager > delivery_manager > employee).

---

## Tech decisions

| Concern | Decision | Rationale |
|---|---|---|
| Core UI | MUI v6 (`@mui/material`) | Best TypeScript, WCAG, largest Western enterprise adoption |
| Icons | `@mui/icons-material` | Consistent with MUI |
| Data grid | `@mui/x-data-grid` | Virtual scroll, column pinning, best-in-class |
| Date pickers | `@mui/x-date-pickers` | Consistent with MUI |
| Charts | `recharts` | React-first, composable, tree-shakeable |
| Org chart / graphs | `@xyflow/react` (React Flow) | Interactive, zoomable, custom nodes, industry standard |
| Auth: local | `passport-local` + `bcrypt` | Standard, auditable |
| Auth: LDAP | `passport-ldapauth` | Real LDAP integration; test server: bitnami/openldap |
| Auth: Azure AD | `openid-client` | Standard OIDC, works with any provider |
| 2FA | `otplib` + `qrcode` | RFC 6238 TOTP, compatible with all authenticator apps |
| VPS | Hetzner CX22 (€4.15/mo) | Sufficient for all containers |
| Domain / SSL | sslip.io + Caddy (Let's Encrypt) | Zero cost, zero config |
| GitHub | Free Organisation | Team access control, GHCR namespace |
| Staging | None (cost) | Local Docker serves as integration env |
| DB in prod | Containerized PostgreSQL | Migrate to Hetzner Managed DB when load demands |

---

## Infrastructure decisions

- **Repo:** Free GitHub Organisation
- **CI:** GitHub Actions — `backend` job + `frontend` job + `build-check` (production image smoke test) on every push
- **CD:** Push to `main` → build images → push to GHCR → SSH deploy to Hetzner VPS → health check → auto-rollback
- **Branch strategy:** `feature/*` → `develop` → `main`. PRs always target `develop`.
- **Production images:** tagged with 7-char Git SHA for traceability; `latest` tag also updated
- **Secrets:** stored in GitHub Actions secrets, never in the repo. VPS has `.env.prod` set once during initial setup.

---

## Phase execution plan

### Phase 0 — Infrastructure scaffolding ✅ COMPLETE

Every subsequent commit is deployable to the VPS from day one.

| Deliverable | Status |
|---|---|
| Backend `Dockerfile` production stage (non-root, compiled, pruned deps) | ✅ |
| Frontend `Dockerfile` production stage (Vite build → nginx:1.27-alpine) | ✅ |
| `frontend/nginx.conf` (SPA routing, gzip, security headers) | ✅ |
| `docker-compose.prod.yml` (Caddy, no source mounts, all secrets from env) | ✅ |
| `Caddyfile` (reverse proxy, Let's Encrypt, `$CADDY_DOMAIN`) | ✅ |
| `bitnami/openldap` in `docker-compose.yml` tools profile | ✅ |
| `.github/workflows/deploy.yml` (build → GHCR → SSH → health check → rollback) | ✅ |
| `.github/workflows/ci.yml` (backend + frontend + build-check jobs) | ✅ |
| `.github/pull_request_template.md` (JTBD-anchored checklist) | ✅ |
| `.env.example` (all feature toggles, superadmin seed vars, grouped) | ✅ |

---

### Phase 1 — Authentication & Authorization Layer 🔄 IN PROGRESS

**Exit criterion:** open the app, land on `/login`, log in as superadmin, reach `/admin`. No external services required.

#### 1A — Backend: multi-provider auth module

| Deliverable | Status |
|---|---|
| `delivery_manager` added to `platform-role.ts` | ✅ |
| `LocalAccount`, `RefreshToken`, `PasswordResetToken` in `prisma/schema.prisma` | ✅ |
| npm packages installed (passport, bcrypt, otplib, qrcode, openid-client) | ⏳ needs WSL |
| Prisma migration for new auth tables | ⏳ |
| `src/modules/auth/` — `AuthModule`, `AuthService`, `AuthController` | ⏳ |
| Passport strategies: local, ldap (toggled), azure-ad (toggled), jwt-access | ⏳ |
| `@Public()` decorator + `RbacGuard` check to allow auth endpoints | ⏳ |
| `AppConfig` extended with all new auth env vars | ⏳ |
| `AuthModule` registered in `app.module.ts` | ⏳ |
| `seed.ts` — `seedSuperadmin()` function, `clearExistingData()` cleanup | ⏳ |

**Endpoints to implement:**
```
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/password-reset/request
POST /auth/password-reset/confirm
POST /auth/2fa/setup
POST /auth/2fa/verify
POST /auth/2fa/disable
POST /auth/2fa/login
GET  /auth/me
GET  /auth/providers
```

**Key design rules:**
- Access tokens use existing `signPlatformJwt()` from `platform-jwt.ts` — do not reinvent
- Refresh token is opaque (random 32-byte hex), stored hashed, delivered as `HttpOnly; Secure; SameSite=Strict` cookie `dc_refresh`
- 2FA temp token is short-lived JWT with `{ scope: '2fa_pending' }` — only accepted by `/auth/2fa/login`
- LDAP and Azure AD strategies only registered when their toggle is `true`
- When `SMTP_ENABLED=false`: password reset link written to backend log at INFO level, not emailed
- `LocalAccount.roles` field stores platform roles as `String[]` — superadmin seeded with `['admin']`

#### 1B — Frontend: packages + theme

| Deliverable | Status |
|---|---|
| MUI, Recharts, React Flow installed in `frontend/` | ⏳ |
| `frontend/src/app/theme.ts` — MUI theme matching existing design tokens | ⏳ |
| `frontend/src/main.tsx` — `ThemeProvider` + `CssBaseline` wrapping | ⏳ |

#### 1C — Frontend: auth context

| Deliverable | Status |
|---|---|
| `frontend/src/app/auth-context.tsx` — `AuthProvider`, `useAuth()` | ⏳ |
| `frontend/src/lib/api/http-client.ts` — 401 interceptor + refresh retry | ⏳ |
| `frontend/src/app/role-routing.ts` — `getDashboardPath(roles)` | ⏳ |

#### 1D — Frontend: auth pages

| Deliverable | Status |
|---|---|
| `frontend/src/routes/auth/LoginPage.tsx` — login + 2FA step | ⏳ |
| `frontend/src/routes/auth/ForgotPasswordPage.tsx` | ⏳ |
| `frontend/src/routes/auth/ResetPasswordPage.tsx` | ⏳ |
| `frontend/src/routes/auth/TwoFactorSetupPage.tsx` | ⏳ |

#### 1E — Frontend: route protection

| Deliverable | Status |
|---|---|
| `frontend/src/routes/ProtectedRoute.tsx` | ⏳ |
| `frontend/src/routes/RoleGuard.tsx` | ⏳ |
| `frontend/src/app/router.tsx` — auth routes added, AppShell wrapped in ProtectedRoute, per-route RoleGuard | ⏳ |

#### 1F — Frontend: role-aware shell

| Deliverable | Status |
|---|---|
| `frontend/src/app/navigation.ts` — `group` + `allowedRoles` added to all routes | ⏳ |
| `frontend/src/components/layout/SidebarNav.tsx` — filters by principal roles, grouped sections | ⏳ |
| `frontend/src/components/layout/TopHeader.tsx` — displays user name, role badge, logout | ⏳ |

---

### Phase 2 — UI Component Library Migration ⏳ NOT STARTED

MUI replaces custom CSS components progressively. Goal: visual parity first, then enhancement.

| Deliverable |
|---|
| `DataTable` → `MUI X DataGrid` (virtual scroll, sort, filter, pagination) |
| Form fields → MUI `TextField`, `Select`, `DatePicker` |
| `SectionCard` → MUI `Card` + `CardContent` |
| `ErrorState`, `EmptyState`, `LoadingState` → MUI `Alert`, `Skeleton`, `CircularProgress` |
| `OrgChartTree` → React Flow interactive hierarchy (zoomable, draggable, minimap) |
| Dashboard pages → Recharts (`BarChart`, `LineChart`, `PieChart`, `AreaChart`) |
| KPI cards → MUI `Paper` + `Typography` with trend indicators |

---

### Phase 3 — Self-scope Enforcement ⏳ NOT STARTED

| Deliverable |
|---|
| Backend: audit every route, apply `@SelfScope()` where employees see only own data |
| Frontend: `employee` role API calls include `personId` from auth context |
| `delivery_manager` sees only their team's data |

---

### Phase 4 — Operator Workflows ⏳ NOT STARTED

| Deliverable |
|---|
| Exception queue: `acknowledge`, `mark reviewed`, `attach note` actions |
| M365 / RADIUS reconciliation: `ignore with reason`, `mark resolved internally` |
| Deep links: team dashboard anomaly → exception → audit record |

---

### Phase 5 — UX Hardening ⏳ NOT STARTED

| Deliverable |
|---|
| Global React error boundary |
| Loading skeletons on all data-fetching pages |
| Inline form validation (not alert-based) |
| 401 / 403 states on every page that fetches data |
| Action buttons disabled/loading during in-flight requests (prevent double-submit) |
| Empty states with contextual actions |

---

### Phase 6 — Read-model Performance ⏳ NOT STARTED

| Deliverable |
|---|
| Query optimisation: manager scope, team dashboard, workload summary, exceptions, audit |
| Pagination on all unbounded list views |
| Response caching for reference data (dictionaries, org structure) |
| Performance baselines tied to bank-scale seed profile |

---

## Infrastructure runbook (Hetzner VPS)

### Initial VPS setup

```bash
# On Hetzner CX22 running Ubuntu 24.04 LTS
apt update && apt upgrade -y
apt install -y docker.io docker-compose-plugin

# Create app directory
mkdir -p /opt/deliverycentral
cd /opt/deliverycentral

# Copy docker-compose.prod.yml and Caddyfile from repo
# Create .env.prod with production values (rotate AUTH_JWT_SECRET, passwords)
# Set CADDY_DOMAIN=app.YOUR-IP.sslip.io (e.g. app.5-75-220-14.sslip.io)

# First deploy
docker compose -f docker-compose.prod.yml up -d
```

### GitHub Actions secrets required

```
VPS_HOST           — Hetzner VPS public IP
VPS_USER           — SSH user (e.g. root or deploy)
VPS_SSH_KEY        — Private SSH key (matching authorised key on VPS)
CADDY_DOMAIN       — e.g. app.5-75-220-14.sslip.io
GITHUB_TOKEN       — auto-provided by Actions for GHCR
```

### After deploy

HTTPS: `https://app.YOUR-IP.sslip.io` — Caddy auto-provisions Let's Encrypt cert.  
API: `https://app.YOUR-IP.sslip.io/api/health`

---

## Quick reference — current files changed in Phase 0/1

```
Modified:
  Dockerfile                                        — production stage added
  frontend/Dockerfile                               — production stage added
  docker-compose.yml                                — ldap-test service added
  .env.example                                      — full replacement with all toggles
  .github/workflows/ci.yml                          — full replacement with 3 jobs
  src/modules/identity-access/domain/platform-role.ts — delivery_manager added
  prisma/schema.prisma                              — 3 auth models appended

Created:
  frontend/nginx.conf
  docker-compose.prod.yml
  Caddyfile
  .github/workflows/deploy.yml
  .github/pull_request_template.md
  docs/planning/agent-handoff-wsl.md                — detailed WSL agent brief
  docs/planning/master-plan.md                      — this file
```
