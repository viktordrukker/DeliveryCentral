# Customer Integration Handoff — M365 + Jira PPM

**Audience:** ops engineer running the customer-side integration verification during Sprint F-1 (Days 17-18) of the bank-IT pivot.
**Companion:** `docs/runbooks/admin-runbook.md` §2 Integrations.
**Last updated:** 2026-05-11.

This runbook is the step-by-step playbook for connecting DeliveryCentral to the customer's actual M365 and Jira tenants for the first time. Real credentials are out of scope for the dev environment — this doc unblocks the field-engineer who has them.

---

## Day 17 — M365 directory sync

### Pre-flight checklist

- [ ] Customer's M365 tenant ID, client ID, client secret (Entra app registration) — captured via secure channel.
- [ ] Entra app has Graph API permissions: `User.Read.All`, `GroupMember.Read.All`, `Directory.Read.All` (admin-consented).
- [ ] DeliveryCentral env file has placeholders for `M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET`.
- [ ] Customer's expected user count is known (≥10 is enough for first-sync verification).

### Steps

1. **Set env keys** (admin host):
   ```
   docker compose exec backend env M365_TENANT_ID=<...> \
     M365_CLIENT_ID=<...> M365_CLIENT_SECRET=<...>
   ```
   (Or write to the shared `.env` and `docker compose restart backend`.)

2. **Trigger a sync** via admin UI:
   - Sign in as admin.
   - Visit `/admin/integrations`.
   - Find the M365 tile → click **Trigger sync**.

3. **Verify** sync state changed:
   ```
   docker compose exec postgres psql -U postgres -d workload_tracking \
     -c 'SELECT provider, "resourceType", "lastSyncedAt", "lastStatus", "lastError" FROM "IntegrationSyncState" ORDER BY "lastSyncedAt" DESC;'
   ```
   Expected: `m365 | user | <timestamp> | OK | NULL`.

4. **Reconciliation walkthrough**: visit `/integrations/m365/directory/reconciliation`. The page shows:
   - **New** users in M365 not yet in DeliveryCentral.
   - **Updated** users (email / manager / department changed).
   - **Disabled** users (no longer in M365).

5. **Approve the reconciliation**:
   - For initial sync, expect to mass-approve "New" creates (auto-provision if `sso.autoProvisionUsers` is ON via `/admin/feature-flags` → `integrationsM365`).
   - For routine syncs, review the diff before approving.

6. **Spot-check** in `/people`: verify ≥10 fresh `Person` rows now exist, mapped to org units matching M365 departments.

### Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `lastStatus = ERROR`, `lastError` mentions 401 | Wrong client secret / tenant id | Re-issue credentials; verify env keys |
| `lastError` mentions 403 / forbidden_app | Graph permissions not admin-consented | Open Entra app → Permissions → Grant admin consent |
| Empty Person sync but no error | App user-filter excludes everyone | Verify Entra app has `User.Read.All` (not `User.Read`) |

---

## Day 18 — Jira PPM sync

### Pre-flight checklist

- [ ] Customer's Jira Cloud URL + admin API token (or PAT for Jira Data Center).
- [ ] Jira project key(s) to import (e.g. `IT-PROJ`, `OPS-PROG`).
- [ ] DeliveryCentral env file: `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_USER_EMAIL` (for Cloud).
- [ ] `integrations.jira.deployment` setting — `cloud` or `data-center`.

### Steps

1. **Set env keys + restart backend.**

2. **Trigger sync** via `/admin/integrations` → Jira tile → **Trigger sync**.

3. **Verify** at IntegrationSyncState (SQL above):
   `jira | project | <timestamp> | OK | NULL`.

4. **Spot-check** `/projects`: filter by `source: jira-ppm` (or scan for new project codes matching Jira key shape). Expect ≥5 fresh Project rows imported.

5. **Configure mapping** if needed:
   - Project status mapping: Jira `To Do` → DC `DRAFT`; `In Progress` → `ACTIVE`; `Done` → `CLOSED`. Stored in `integrations.jira.statusMap` PlatformSetting.
   - Default PM: who DC assigns when Jira's `lead` field is empty. Stored in `integrations.jira.defaultProjectManagerId`.

### Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `lastError` mentions 401 | Wrong API token | Re-issue via `https://id.atlassian.com/manage-profile/security/api-tokens` |
| Projects sync but PM is always null | `jira.defaultProjectManagerId` unset | Set in `/admin/settings` → Integrations |
| Sync succeeds but `Project.source` is null | `Project.source` enum migration not landed | Apply `prisma/migrations/20260504_*` (see I-02 dev-DB sync) |

---

## Verification gate

Once both syncs pass, you have the v1 onboarding canary working:

- [ ] M365 sync: ≥10 Person rows imported, `IntegrationSyncState.lastStatus = OK`
- [ ] Jira sync: ≥5 Project rows imported with `source = 'jira-ppm'`
- [ ] Spot-check 1 employee can log in via local-account (or SSO if `integrationsOidc` is flagged ON)
- [ ] Spot-check 1 project in `/projects/:id` shows the imported metadata

Proceed to **Day 19 backup/restore drill** (`docs/runbooks/pitr-restore.md`).
