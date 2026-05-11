# DeliveryCentral — Admin Operations Runbook

**Audience:** Tenant administrator (admin / superadmin / IT ops) for an IT-block deployment.
**Companion:** `docs/planning/bank-it-deployment-runbook.md` (Day-1 setup) and `docs/runbooks/panic.md` (incident response).
**Last updated:** Sprint F-1.2 (2026-05-11).

---

## 1. Setup (first-day install)

Use the in-app **Setup Wizard** at `https://<host>/setup` per the `bank-it-deployment-runbook.md`. The wizard handles migrations, tenant create, admin account, integrations, and seed.

Key post-wizard checks:

1. `curl https://<host>/api/health` returns `{ "status": "ok" }`
2. `curl https://<host>/api/health/deep | jq '.status'` returns `"ready"` for all 12 aggregates
3. Sign in as the admin account. Land on Workload Overview (`/`).
4. Visit `/admin/feature-flags` — confirm 88 flags listed with sensible v1 defaults.
5. Visit `/admin/integrations` — confirm M365 + Jira show "Configured" once env keys are set.

---

## 2. Daily operations

### Health + monitoring

| Surface | What to check |
|---|---|
| `/api/health` | `status:"ok"` |
| `/api/health/deep` | `status:"ready"` for all aggregates |
| `/api/metrics` (HD-11) | Prometheus scrape; verify `dc_outbox_events_dispatched_total`, `dc_assignment_sla_breached_total` increase under load |
| `/admin/monitoring` | Read-only view of integration sync state, migration audit, audit log volume |
| `/admin/audit` | Business Audit page; spot-check 5-10 most-recent rows (now writes correctly post Sprint F-0.3) |

### User management

- **Create employee:** `/admin/people/new` — 3-step lifecycle wizard. Skills go through PersonSkill multi-picker (silent-drop bug fixed Sprint F-0.5).
- **Deactivate employee:** `/people/:id` → Lifecycle → Deactivate. Writes AuditLog `person.deactivated` + `EmployeeActivityEvent.DEACTIVATED` + opens an OFFBOARDING case (Sprint F-0.4).
- **Terminate employee:** same flow, choose Terminate. Cascade-closes their open assignments.
- **View-as / impersonation:** admin avatar menu → "View as". Persistent banner shows the impersonated identity. Use to debug role-specific issues.

### Bulk operations

Bulk import (`/admin/people/import`) is **flag-gated OFF in v1** (Decision-9). Enable via `/admin/feature-flags` → `adminBulkImport` if you need CSV uploads for cohort onboarding.

### Integrations

- **Jira PPM sync:** scheduled via `/admin/integrations`. Pulls project metadata. Verify a successful sync in `/admin/monitoring` → "Integration Sync State".
- **M365 directory sync:** `/admin/integrations/m365`. Pulls people + manager hierarchy. Reconciliation walkthrough at `/integrations/m365/directory/reconciliation`.
- **OIDC SSO + LDAP + JSM:** flag-gated OFF in v1 (Decisions 9 / Cat-1.1 / Cat-1.2). Enable via `/admin/feature-flags` when the customer's IdP / Service Desk is ready.

---

## 3. Feature-flag operations

Visit `/admin/feature-flags` to see all 88 registered flags grouped by category. Each entry shows:

- **id** — TypeScript identifier (e.g. `staffingProposalSlate`)
- **key** — PlatformSetting row key (e.g. `flag.feature.staffing.proposalSlate.enabled`)
- **description** — what the flag controls
- **maturity** — `scaffolded` / `developing` / `beta` / `ga` / `deprecated`
- **owner** — engineer/team responsible (notified on shadow-CI failure)
- **state** — current resolved value (ON / OFF)

Click **Enable** or **Disable** to flip a flag. The change takes effect on the next request after the 30-second flag cache cycle (`PlatformFlagsService.FLAG_CACHE_TTL_MS`). The BE invalidates the cache server-side, so a fresh refresh shows the new state immediately.

**Caution:** before flipping a flag from `beta` → ON in production, verify:
1. Shadow CI has been green for at least one sprint (`npm run verify:shadow` nightly).
2. The flag's `dependsOn:` array is satisfied (e.g. `dashPortfolioRadiator` requires `projectRadiator`).
3. There's a rollback path: another flag flip back to OFF is the cleanest rollback.

---

## 4. GDPR / right-to-erasure

Per Sprint F-0.8 / Cat-1.8: GDPR redact-payload v1 strategy.

```
POST /api/admin/persons/:id/forget
```

Effect: AuditLog rows for the named Person have `payload.email` and `payload.actorDisplayName` set to `[redacted]`. Hash chain remains valid. Person row stays for relational integrity (`actorId onDelete: SetNull` cascades but the rows themselves are preserved).

**Retention purge:** the `audit.retentionDays` PlatformSetting + nightly cron deletes AuditLog rows older than the configured horizon. Default = indefinite (set explicitly per jurisdictional requirement).

---

## 5. Rollback procedures

### Application rollback (image swap)

Deployment is image-tag based. To roll back:

```
docker compose down
DC_IMAGE_TAG=<previous-sha> docker compose up -d
docker compose exec backend curl -sS http://localhost:3000/api/health/deep | jq .
```

DB migrations are **not** rolled back automatically. Each migration has a `rollback.sql` — apply manually if needed:

```
docker compose exec postgres psql -U postgres -d workload_tracking -f /app/prisma/migrations/<version>/rollback.sql
```

### Feature flag rollback

Flag flips are immediate. To revert a flip, visit `/admin/feature-flags` and toggle the flag back. The 30-second cache cycle means the previous value is fully restored within a minute.

### Database emergency

For a `panic` state (read-only / halt / restore-last-good), see `docs/runbooks/panic.md`. Three escalation levels:

1. **Read-only:** `ops/panic-readonly.sh` — flips `default_transaction_read_only = on`; terminates non-admin sessions.
2. **Halt:** `ops/panic-halt.sh` — stops backend container; revokes app_runtime grants.
3. **Restore last-good:** `ops/db-last-good.sh` — restores the most-recent PITR snapshot.

---

## 6. Escalation

When the platform is misbehaving in a way this runbook doesn't cover:

1. Capture `docker compose logs backend --tail=200`
2. Capture `curl https://<host>/api/diagnostics`
3. Capture `/admin/monitoring` screenshot
4. Open the per-flag owner email/Slack from `/admin/feature-flags` for the impacted feature

---

## 7. Reference

- Bank-IT pivot plan: `/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md`
- Sprint F-0/F-1 status: `docs/planning/MASTER_TRACKER.md`
- 24 UAT scenarios: `docs/planning/ULTIMATE_ANALYSIS_AND_PLAN.md` §X.2
- Bank-IT-specific Day-1 onboarding: `docs/planning/bank-it-deployment-runbook.md`
- Feature flag registry source: `src/shared/config/platform-flags.service.ts`
- Frontend flag mirror: `frontend/src/lib/feature-flags.ts`
