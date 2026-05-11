# Clickthrough Gap Report — 2026-05-10

**Status:** complete. Side-job 2 of the bank-IT pivot plan.

**Run:** `node scripts/jtbd-walker.cjs` against `localhost:5173` + `localhost:3000`. 48 walks (40 JTBD baseline + 8 bank-IT lap) at 2026-05-10. Total walker time ~3.5 minutes. Output:

- 48 PNG screenshots: `docs/planning/jtbd-screenshots/baseline-2026-05-10/`
- Machine-readable: `docs/planning/jtbd-screenshots/baseline-2026-05-10/walker-results-baseline.json`
- Walker source (now committed): `scripts/jtbd-walker.cjs`

**Counts:**

| Metric | Value |
|---|---|
| JTBD baseline walks | 40 |
| Bank-IT lap probes | 8 |
| Total entries | 48 |
| Entries with ≥1 console error | 36 |
| Pageerror occurrences ("Insufficient role for this operation.") | 4 |
| Routes that redirected | 5 |
| Bank-IT lap routes rendered as fall-through admin index | 7 of 8 |
| Bank-IT lap route that RBAC-redirected | 1 of 8 (`/cases/new` for employee → `/dashboard/employee`) |

---

## 1. Phase 4 baseline → 2026-05-10 walker reconciliation

Phase 4 (2026-04-09) reported **27 GREEN / 11 AMBER / 2 RED**. The Phase 11 xlsx Sheet 3 showed **25 GREEN / 13 AMBER / 2 RED** (encoding drift between the audit doc text and the machine-readable matrix). The 2026-05-10 walker confirms the **2 RED** items unchanged and finds the AMBER set is approximately 11–13 depending on whether you count silent-RBAC-error routes as AMBER or GREEN-with-noise.

| Phase 4 finding | 2026-05-10 status | Closing Cat-1 ticket |
|---|---|---|
| **A4** `/admin/audit-log` RED — admin index renders | **STILL RED** — same fall-through behaviour | Cat-1.5 D-114 |
| **E4** `/work-evidence` RED — silent redirect to `/dashboard/employee` | **STILL RED** — confirmed `/work-evidence → /dashboard/employee` redirect | Cat-1.4 D-116 |
| **A5** `/admin/setup` AMBER — no post-install surface | **STILL AMBER** — `/setup` redirects to `/dashboard/director` for already-set-up tenant | Cat-1.5 D-117 |
| **D2** Portfolio radiator `0% Green / 0% Critical` | **STILL AMBER** — KPIs load but radiator zeros visible | Cat-1.5 D-115 |
| **R1** Sophia 6-person team shows `0% Util` | **STILL AMBER** — confirmed `0%Utilization` in walker KPI capture | Cat-1.4 D-120 |
| **X1** Dual-role default = `/dashboard/hr` (HR > RM precedence) | **STILL AMBER** — confirmed dual_role `/ → /dashboard/hr` | Cat-1.4 D-119 |
| **H5** `/admin/dictionaries` AMBER — D-101 consolidation pending | **STILL AMBER** — endpoint loads but consolidation not done | Cat-2 T-09 D-101 |
| **R5** `/staffing-board` redirect to `/staffing-desk?view=timeline` | **STILL GREEN** — redirect works, drag-write inside staffing-desk pending | Cat-1 T-16 D-118 |
| **D-status** PvA pageerror "Insufficient role for this operation" (×2) | **CONFIRMED** — 4 pageerror occurrences across the matrix | Cat-1.4 D-121 |
| Many roles' dashboards: 403s on background fetches | **CONFIRMED** — D1 director dash 83 errors, D3/D4/DM2 47 each, P5 37, DM1 17 | Cat-1.4 D-121 (signal expansion) |

**No new RED items surfaced.** No surprise regressions vs Phase 4 baseline.

---

## 2. Bank-IT lap probe results

Per the locked plan the walker probed 8 routes that don't exist today. Findings:

| Route | Walker behaviour | Interpretation | Cat-1 ticket |
|---|---|---|---|
| `/admin/sso` | Renders `Admin` (h1) — fall-through to admin index | Route exists in manifest but no dedicated component — placeholder needed | D-155 (Cat-1.1) |
| `/admin/ldap` | Renders `Admin` | Same | NEW C1-LDAP (Cat-1.1) |
| `/admin/jsm` | Renders `Admin` | Same | NEW C1-JSM (Cat-1.2) |
| `/admin/feature-flags` | Renders `Admin` | Same | NEW C2-FLAG-REGISTRY |
| `/admin/integrations/registry` | Renders `Admin` | Same | NEW C1-INT-FRAMEWORK (Cat-1.2) |
| `/admin/roles` | Renders `Admin` | Same | D-159 admin UI (Cat-1.9) |
| `/admin/platform-settings` | Renders `Admin` | Same | NEW C1 5.16 (Cat-1.5) |
| `/cases/new` (as employee) | Redirects to `/dashboard/employee` | RBAC denies employee creating cases via that route OR route doesn't accept employees | NEW C1-EMP-CASE (Cat-1.4) |

**Implication for the post-clickthrough placeholder pre-pass:** the 7 admin routes need a routed component override (today they fall through to admin index). The 8th — employee Report Issue — needs a different path: either widen `/cases/new` for employee role + simplify the form (preferred per the plan), or introduce a new `/dashboard/employee/report-issue` route. The plan owns this decision.

**All 7 admin probe routes capture screenshots showing the admin index** — the screenshots themselves are evidence that "the URL navigates somewhere but not to a dedicated surface". Future agents reading the placeholder pages (when built) will see the structured "what to wire" panel instead.

---

## 3. Per-role summary

### admin
- **Works:** A1 (Workload Overview KPIs render), A2 (Jira integration tile visible), A3 (admin index loads).
- **Broken / missing:** A4 audit log RED (no FE), A5 setup post-install AMBER (one-shot redirect).
- **Bank-IT gaps:** all 7 probed surfaces fall through to admin index (placeholders needed).

### director
- **Works:** D1 dashboard renders (14 Active Projects KPI confirmed), D2 radiator KPIs surface, D3-D5 routes load.
- **Noisy:** D1 has 83 console errors; D3/D4 47 each — background data fetches failing with 403 (silent RBAC). Phase 11 D-121 in Cat-1.4 closes.
- **Broken / missing:** D2 portfolio radiator data path (`0% Green / 0% Critical` despite 14 projects) — D-115 in Cat-1.5.

### hr_manager
- **Works:** H1-H5 routes all load; HR Dashboard `202 Total Headcount` KPI renders.
- **Noisy:** 2 console errors per route (likely the same 403 background fetches).
- **Broken / missing:** H4 dictionaries → D-101 / Cat-2 T-09 consolidation pending.

### resource_manager
- **Works:** R2-R5 all load; staffing-desk shows `199 Supply / 7 Open Demand / 27% Fill Rate / 15 Overallocated`.
- **Broken / missing:** R1 RM dashboard `0% Utilization` for Sophia's team — D-120 in Cat-1.4.

### project_manager
- **Works:** P1-P5 all load; P4 timesheet approval renders `2 Pending / 4179 Gap Days`.
- **Noisy:** P5 (`/projects` for close) has 37 console errors.
- **Broken / missing:** P2 (`/staffing-requests/new`) has 3 errors but loads.

### delivery_manager
- **Works:** DM1 dashboard `14 Active Projects / 105 Active Assignments`; DM3 PvA `0% Alignment Rate / 0 of 4 aligned / 5716h Total Submitted`.
- **Noisy:** DM1 17 errors, DM2 47 errors (background fetches).
- **Broken / missing:** DM2 budget approve FE (D-92 in Cat-1.5), DM4 case approve FE (D-91 in Cat-1.5), DM5 period locks admin FE (D-93 in Cat-1.5).

### employee
- **Works:** E1 my-time `0h Reported of 168h expected / 21 Gap Days`; E3 dashboard renders.
- **Broken / missing:** E4 work-evidence redirect to dashboard (D-116 RED). E5 people page has pageerror.
- **Bank-IT gap:** BANK-8 (`/cases/new` for employee) redirects to dashboard — `Report an issue` flow needs to be built (NEW C1-EMP-CASE).

### dual_role
- **Works:** M2-M5 load; HR dashboard the default landing.
- **Broken / missing:** M1 default landing precedence (D-119 AMBER in Cat-1.4) — HR wins over RM, undocumented.

---

## 4. Cross-reference: walker findings → Cat-1 / Cat-2 tickets

| Walker finding | Severity | Closing ticket | Category |
|---|---|---|---|
| A4 `/admin/audit-log` route missing | RED | D-114 (1.7 admin nav restructure + D-114 surface) | Cat-1 |
| E4 `/work-evidence` RBAC redirect | RED | D-116 widen self-scope OR relocate | Cat-1 |
| A5 `/admin/setup` post-install missing | AMBER | D-117 | Cat-1 |
| D2 portfolio radiator `0% Green / 0% Critical` | AMBER | D-115 | Cat-1 |
| R1 Sophia 6-person `0% Util` | AMBER | D-120 | Cat-1 |
| X1 dual-role precedence undocumented | AMBER | D-119 | Cat-1 |
| H5 dictionaries consolidation pending | AMBER | D-101 / T-09 | Cat-2 |
| Silent JS RBAC errors (4 pageerrors + many 403s) | AMBER | D-121 | Cat-1 |
| 7 bank-IT admin probe routes fall through | gap | placeholder pre-pass + then D-155/D-159/NEW-* | Cat-1 (build) + Cat-2 (flag) |
| 1 bank-IT employee probe route RBAC-blocks | gap | NEW C1-EMP-CASE | Cat-1 |
| `/timesheets/approval` → `/time-management` redirect | works as designed | D-88 already in Cat-1.7 | Cat-1 |
| `/staffing-board` → `/staffing-desk?view=timeline` redirect | works as designed | D-118 already in Cat-1 T-16 | Cat-1 |

---

## 5. Sequencing recommendation

Per the locked plan + walker findings, the next surgical step is to **build placeholder pages for the 8 bank-IT lap routes**. Each placeholder is a routed component containing:

- Page title + intended JTBD
- "What to wire" task list with D-id / NEW-C1-* refs
- Reference to NEXT_ITERATION_PLAN.md sections
- "Pick this up" CTA

After placeholders land, re-walk the bank-IT lap to capture the placeholder content for traceability (the screenshots will then show structured instruction panels instead of admin-index fall-through).

After placeholders, surgical Cat-1 priority order (per Phase 11 score, with bank-IT pivot adjustments):

1. **T-07 Locale-agnostic settings** (Cat-1.3) — 5–7d. Highest score; smallest blast radius.
2. **D-110 FK indexes + CI lint** (Cat-1.6) — 2d. Hardening; prereq for any future MV work.
3. **D-144/145/146 hot-path queries** (Cat-1.6) — 3–5d. Perf safety net.
4. **D-115/D-119/D-120/D-121 dashboard data quality** (Cat-1.4) — 5–7d. Closes 4 walker AMBER findings.
5. **D-91/D-92/D-93/D-114/D-117 approval gaps + admin surfaces** (Cat-1.5) — 6–8d. Closes A4 RED + 3 AMBER + 2 missing surfaces.
6. **D-116 work-evidence RBAC** (Cat-1.4) — 3d. Closes E4 RED.
7. **D-155 OIDC handler + D-156 M365 auto-provision** (Cat-1.1) — 8–12d. SSO unblocker.
8. ... (rest per Phase 11 ordering).

---

## 6. Walker tooling — newly committed

`scripts/jtbd-walker.cjs` is now committed for re-runnable validation. Performance: ~3.5 minutes for 48 walks (login-per-role = 8 logins + 48 navigations). Output schema matches Phase 4's `walker-results.json` so historical comparisons remain valid.

To re-walk after Cat-1 implementation:

```bash
docker compose ps                            # confirm backend + frontend healthy
node scripts/jtbd-walker.cjs                 # ~3-5 min runtime
# inspect new screenshots + walker-results-baseline.json
```

To target a different snapshot directory:

```bash
OUT_DIR=docs/planning/jtbd-screenshots/baseline-2026-XX-XX node scripts/jtbd-walker.cjs
```

---

## 7. Decisions / open questions for the surgical phase

1. **Placeholder page shape** — single `<PlaceholderPage>` shared component reading from a registry, or per-route components? The shared component is cheaper to build but loses type-safety. Recommendation: shared component with typed `placeholderRegistry` map.

2. **`/cases/new` for employee** — widen role gate or introduce `/dashboard/employee/report-issue`? Recommendation: widen + simplify the form for employee role (simpler form fields when role=employee).

3. **Console-error baseline** — should D-121 close set a CI gate at "0 console errors per dashboard navigation"? Recommendation: yes, ratchet the gate at "0 console errors on the 8 main role landing pages" and add a Playwright fixture asserting it.

---

_End of clickthrough-gap-report-2026-05-10.md._
