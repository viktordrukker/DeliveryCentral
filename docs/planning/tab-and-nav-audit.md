# Tab and Nav Audit (Phase 7)

**Run date:** 2026-05-10
**Method:** Read `frontend/src/app/route-manifest.ts` (213 lines, 60+ routes), `frontend/src/components/layout/SidebarNav.tsx` (group ordering + labels + my-work computed section), and cross-referenced the per-route persona/JTBD assignments at `docs/planning/phase18-route-jtbd-audit.md` (74 lines, 60+ routes mapped). Also leveraged Phase 2's confirmed redundancies (D-91, D-101, D-102) and Phase 4's RBAC findings (D-116, D-119, D-121).

This audit is intentionally narrower than Phases 1–4 because the structural data was directly readable from `route-manifest.ts` — the substance is in deciding which restructure to recommend, not in discovering routes.

---

## Current category tree

The `RouteGroup` type at `frontend/src/app/route-manifest.ts:10` is:

```ts
type RouteGroup = 'dashboard' | 'people-org' | 'work' | 'governance' | 'evidence' | 'admin';
```

The sidebar render order (`SidebarNav.tsx:42-49`) is:

```
dashboard → people-org → work → governance → evidence → admin
```

Group labels (`SidebarNav.tsx:33-40`):

| Group key | Display label | Routes (incl. `navVisible:false`) |
|---|---|---|
| `dashboard` | Dashboards | 9 — Workload Overview (`/`), 7 role dashboards, Portfolio Radiator |
| `people-org` | People & Org | 5 — Org, People, Teams, Workload Matrix¹, Workload Planning¹ |
| `work` | Work | **18** — Projects, Assignments, Approval Queue, Resource Pools, My Time, Time Management, Timesheets¹, Timesheet Approval¹, Leave¹, 5 Reports, Cases, Staffing Requests¹, Staffing Board¹, Staffing Desk |
| `governance` | Governance | **2** — Exceptions, Integrations (read-only — duplicate of `/admin/integrations` per D-101) |
| `evidence` | Evidence Management | **1** — Work Evidence |
| `admin` | Admin | **15** — Admin, Dictionaries, Business Audit, Notifications Admin, Integrations Admin, Monitoring, Metadata / Admin, Platform Settings, Bulk Import, Vendors, Webhooks, HRIS Integration, Access Policies, Radiator Thresholds, Organization Config |

¹ `navVisible: false` (hidden from sidebar; reachable via direct link or redirect).

There's also an **implicit "My Work" pseudo-group** computed at sidebar render time (`SidebarNav.tsx:82-87`):

```ts
const myWorkItems = [
  ...(canSeeEmployeeDash ? [{ ..., path: '/dashboard/employee', title: 'My Dashboard' }] : []),
  { ..., path: '/settings/account', title: 'Account Settings' },
];
```

This is per-user, role-aware, and not stored as a `RouteGroup`. It's the spec's "MY WORK" group — but it lives only in render-time logic, not in the manifest.

---

## Group population assessment

| Group | Visible count | Hidden count | Total | Verdict |
|---|---:|---:|---:|---|
| dashboard | 9 | 0 | 9 | ✓ healthy |
| people-org | 3 | 2 | 5 | ✓ ok (workload pair already redirects to /staffing-desk per D-91) |
| work | 12 | 6 | **18** | ❌ **overloaded** — mixed concerns (projects, time, reports, cases, staffing) |
| governance | 2 | 0 | 2 | ❌ **underused + has a duplicate** (D-101) |
| evidence | 1 | 0 | 1 | ❌ **sole-occupant group** |
| admin | 15 | 0 | 15 | ❌ **overloaded** (setup + integrations + audit all mixed) |

Only **dashboard** and **people-org** are healthy. Three groups (work, governance, evidence, admin) need restructuring.

---

## What's wrong

### work — overloaded (18 routes spanning 5 different domains)

The `work` group contains:
- **Project lifecycle** — Projects, Assignments, Approval Queue, Resource Pools (4)
- **Time + leave** — My Time, Time Management, Timesheets¹, Timesheet Approval¹, Leave¹ (5; 3 redirects)
- **Reports / analytics** — Time Analytics, Capitalisation, Export Centre, Utilization, Report Builder (5)
- **Cases** — Cases (1)
- **Staffing operations** — Staffing Requests¹, Staffing Board¹, Staffing Desk (3; 2 redirects)

These are 5 distinct user concerns lumped under one label. A PM looking for "Approval Queue" and a finance user looking for "Capitalisation" both find them under "Work" but neither flow is similar.

### governance — has 2 entries, one of which is a duplicate

- `/exceptions` is operational triage — fits "Operations" or "Anomalies" better than "Governance"
- `/integrations` is a read-only duplicate of `/admin/integrations` per **D-101 / functional-duplication-register row 16** — clarification needed there, not a Governance entry

The label "Governance" implies budget approvals, period locks, audit oversight — none of which surface here. The only genuine governance touchpoint is the (broken) Approve Case endpoint (D-91), the missing Approve Budget Change FE (D-92), and the missing Period Lock UI (D-93). If those land, Governance becomes meaningful; today it's a phantom.

### evidence — single-route group

`/work-evidence` is the only entry. A group label for one route is not a category; it's a folder with one file. Plus per **D-116**, the only role that can see this route is `director` / `admin` (the persona JTBD for `employee` is broken).

### admin — overloaded (15 routes spanning 4 different operator concerns)

- **Top-level index** — `/admin` (1)
- **Configuration** — Platform Settings, Organization Config, Radiator Thresholds, Metadata / Admin, Dictionaries (5)
- **Integrations & health** — Admin Integrations, Monitoring, HRIS, Webhooks (4)
- **People & access** — Bulk Import, Access Policies, Vendors (3)
- **Audit** — Business Audit (1)
- **Notifications** — Notifications Admin (1)

A 15-route flat list is hard to scan. Per **D-117**, admin has no consolidated control surface; this audit explains why — the admin group is itself the surface, and it's flat.

---

## Per-role visibility (cross-reference Phase 4)

Phase 4's walker confirmed:

| Role | Default landing | Issue |
|---|---|---|
| employee | `/` → `/dashboard/employee` | OK; but `/work-evidence` redirects to dashboard (D-116, RBAC blocks) |
| director | `/dashboard/director` | OK |
| hr_manager | `/dashboard/hr` | OK |
| resource_manager | `/dashboard/resource-manager` | OK; sees 0% util in managed team (D-120) |
| project_manager | `/dashboard/project-manager` | OK |
| delivery_manager | `/dashboard/delivery-manager` | OK |
| dual-role (RM+HR) | `/dashboard/hr` (HR wins) | precedence undocumented — D-119 |
| admin | `/` → Workload Overview | functional but no admin-specific landing |

Several silent JS RBAC errors per D-121.

---

## Cmd+K palette assessment

Per Phase 2 register §6 (refuted candidate "3 nav paths"), the Cmd+K palette, sidebar, and breadcrumb all derive from a single source of truth (`appRoutes` in `frontend/src/app/navigation.ts`, which itself is derived from `route-manifest.ts`). The palette uses the same `group` field for organization, so when the sidebar's grouping is bad, the palette's grouping is bad too. Fix the manifest groups → both nav surfaces improve.

The palette **does not** today enforce a "tier" concept (frequently-used vs configurable) — it just lists everything the user has access to, by group. A tier organization (e.g., "Top actions" / "Pages" / "Admin") could be valuable but is out of scope for a pure category review.

---

## Proposed category tree

A rationale-driven restructure (changes drive: split overloaded groups; eliminate sole-occupant groups; rename governance):

| New group key | Display label | Routes |
|---|---|---|
| `dashboard` | Dashboards | unchanged — 9 |
| `people-org` | People & Org | unchanged — 5 (Org, People, Teams + 2 redirects) |
| **`projects`** | Projects & Delivery | Projects, Assignments, Approval Queue, Cases (4) — project lifecycle and case operations |
| **`staffing`** | Staffing & Capacity | Resource Pools, Staffing Desk, Staffing Requests¹, Staffing Board¹, Workload Matrix¹, Workload Planning¹ (6; 4 redirects) — supply/demand console |
| **`time`** | Time & Leave | My Time, Time Management, Timesheets¹, Timesheet Approval¹, Leave¹ (5; 3 redirects) |
| **`reports`** | Reports & Analytics | Time Analytics, Capitalisation, Export Centre, Utilization, Report Builder, **Work Evidence** (folded from `evidence`), **Exceptions** (folded from `governance`) (7) |
| **`admin-config`** | Setup & Configuration | Admin (index), Platform Settings, Organization Config, Radiator Thresholds, Metadata / Admin, Dictionaries (6) |
| **`admin-integrations`** | Integrations & Health | Admin Integrations, Monitoring, HRIS, Webhooks (4) |
| **`admin-governance`** | People & Governance | Bulk Import, Access Policies, Vendors, Business Audit, Notifications Admin (5) |

That's 9 groups (vs current 6), with no group having fewer than 4 entries or more than 9. The current overloaded `work` (18) splits into 4 focused groups; `governance`/`evidence` retire as sole-occupant or empty-feeling groups; `admin` splits into 3 operator concerns.

**Notes on choices:**
- **Cases under Projects & Delivery** — case workflows are project-related (onboarding, transfers, performance) more than they are operations. PMs/HRs use cases primarily as project artifacts. If a customer treats cases as standalone, this can flip.
- **Exceptions in Reports & Analytics** — exceptions are a triage queue but are read-mostly (the operator scans, drills, then acts elsewhere). Reports/Analytics frames "things to look at"; Operations would be a better label if 3+ "operational queue" routes existed, but with 1, Reports is the cheaper home.
- **Renaming the legacy "governance" group** is a cleaner story than restoring it. If D-91/D-92/D-93 land (case approval / budget approval / period lock), those approval surfaces could form a real `governance` group later.
- **Splitting admin into 3** — config / integrations / governance — directly addresses D-117 (no consolidated admin control surface) without requiring a single big admin landing. The thin `/admin` page becomes the configuration index.

---

## Top 20 nav wins (already realized)

For completeness:
- All three nav surfaces (sidebar, Cmd+K palette, breadcrumb) share a single source of truth (`appRoutes`)
- 7 roles defined; 11 named role-list constants centralized at `route-manifest.ts:29-105`
- `canAccessRoute(path, roles)` is the canonical RBAC check — used by all three nav surfaces
- Sidebar pin/unpin is per-user via localStorage (`SidebarNav.tsx:30`)
- `navVisible: false` correctly hides legacy routes that still resolve as redirects (D-91, D-101, D-102)
- Routes with no `group` (auth pages, system routes) are correctly excluded from sidebar

---

## New D-item proposals (Phase 7)

| New D-id | Description |
|---|---|
| D-136 | [REORG] Split overloaded `work` group (18 routes, 5 distinct concerns) into 4 groups: `projects` (Projects, Assignments, Approval Queue, Cases), `staffing` (Resource Pools, Staffing Desk, Staffing Requests, Staffing Board, Workload Matrix, Workload Planning — folds `people-org` workload entries), `time` (My Time, Time Management, Timesheets, Timesheet Approval, Leave), `reports` (5 reports + Work Evidence + Exceptions). Update `RouteGroup` type, `GROUP_LABELS`, `GROUP_ORDER` in `SidebarNav.tsx`. Pure rename + manifest re-tag; no behavior change |
| D-137 | [REORG] Retire empty `governance` group: fold `/exceptions` into `reports` (Operational Queue → Reports & Analytics); resolve `/integrations` duplicate per D-101 (it's the read-only twin of `/admin/integrations`). The label "Governance" can return when D-91 (case approve), D-92 (budget approve), D-93 (period lock) land — those are real governance surfaces |
| D-138 | [REORG] Retire sole-occupant `evidence` group: fold `/work-evidence` into `reports`. Consistent with the JTBD audit's framing of work-evidence as analysis (filter / export / review anomalies). Companion to **D-116** (employee RBAC fix); a future per-user "My Work Evidence" lives under the per-user My Work pseudo-group, not as a top-level group |
| D-139 | [REORG] Split overloaded `admin` group (15 routes) into 3: `admin-config` (Admin index, Platform Settings, Organization Config, Radiator Thresholds, Metadata / Admin, Dictionaries), `admin-integrations` (Admin Integrations, Monitoring, HRIS, Webhooks), `admin-governance` (Bulk Import, Access Policies, Vendors, Business Audit, Notifications Admin). Closes **D-117**'s "no consolidated post-install control surface" by making the structure self-explanatory; the thin `/admin` index becomes the `admin-config` landing |
| D-140 | [TYPE] Update `RouteGroup` type at `route-manifest.ts:10` from current 6 keys to 8 keys (or 9 if dashboard splits): `'dashboard' \| 'people-org' \| 'projects' \| 'staffing' \| 'time' \| 'reports' \| 'admin-config' \| 'admin-integrations' \| 'admin-governance'`. Mechanical re-tag of route entries; no schema change. Coordinated with D-136..D-139 |
| D-141 | [DOC] Codify the implicit "My Work" pseudo-group at `SidebarNav.tsx:82-87` — currently computed at render time (employee dashboard + account settings, role-aware), invisible in `route-manifest.ts`. Either (a) introduce a real `'my-work'` group (lightweight, 2 routes) or (b) add a top-of-file comment in `route-manifest.ts` explaining that "My Work" is rendered separately by the sidebar. Cheap; closes a discoverability gap for future engineers |

(6 items; counter ends at D-141.)

---

## Phase 7 acceptance status

- ✅ Current category tree captured (with route counts per group)
- ✅ Per-role visibility confirmed via Phase 4 cross-reference (no new walker needed)
- ✅ Cmd+K palette tier organization assessed (single source of truth; no tier today)
- ✅ Underused / empty groups flagged (governance + evidence)
- ✅ Overloaded groups flagged (work + admin)
- ✅ Proposed category tree with rationale (9 groups, 4-9 entries each)
- ✅ 6 new D-items D-136..D-141

**Net new findings for Phase 7:** category restructure across 4 of 6 existing groups + the implicit my-work pseudo-group documentation. None of the changes are functional — they're labeling and grouping. Cost is mechanical for engineering (rename + re-tag), expensive for users (muscle memory) so a deliberate rollout is needed.

**Next:** AskUserQuestion → "Phase 7 complete; append D-136..D-141?"
