# V2 Soak — Manual Click-Through Journeys

**Item:** MANUAL-CLICK-THROUGH-30
**Source of truth:** `docs/testing/v2-soak-journeys.json`
**Checklist UI:** `/admin/v2-soak-checklist` (admin only, gated by `dsRefresh`)
**Backend persistence:** `GET/PUT /api/admin/v2-soak/checklist/:sessionId`

This page is the human-readable view of the 30-journey x 8-role matrix (256 cells)
the QA team must walk before the C0 cutover flips `dsRefresh` and `workspaceMe`
defaults to ON.

> The JSON file is the only authoritative source. This Markdown is regenerated
> from that JSON whenever journeys change.

## Exit gate

- **Min pass rate:** 100% of cells whose `expectedOutcome` is `PASS`
- **Blocking on:** any `PASS`-expected cell observed as `FAIL`
- `NOT_APPLICABLE` cells do not count toward the total (e.g., Employee cannot run "Admin defines a custom role").
- `FAIL_EXPECTED` cells must observe `FAIL` (negative-path checks: e.g., Employee must NOT be able to approve a timesheet). Observing `PASS` here is a security regression and blocks the cutover.

## Roles

| Code | Test account (it-company seed) |
|---|---|
| admin | admin@deliverycentral.local |
| director | noah.bennett@itco.local |
| delivery_manager | carlos.vega@itco.local |
| hr_manager | diana.walsh@itco.local |
| resource_manager | sophia.kim@itco.local |
| project_manager | lucas.reed@itco.local |
| employee | ethan.brooks@itco.local |
| dual_role | emma.garcia@itco.local (RM+HR) |

## Journeys

### J-01 — Employee logs in and sees dashboard
Persona: **employee**

Steps:
1. navigate `/login`
2. fillForm `{ email: ethan.brooks@itco.local, password: EmployeePass1! }`
3. submit
4. expectRoute `/dashboard`

Expected outcomes: admin **PASS**, director **PASS**, delivery_manager **PASS**, hr_manager **PASS**, resource_manager **PASS**, project_manager **PASS**, employee **PASS**, dual_role **PASS**

---

### J-02 — Employee submits a weekly timesheet
Persona: **employee**

Expected: PASS for every role.

---

### J-03 — Employee requests leave
Persona: **employee**. Expected: PASS for every role.

---

### J-04 — Employee cancels their own leave request
Persona: **employee**. Blocked by J-03. Expected: PASS for every role.

---

### J-05 — PM creates a new project position
Persona: **project_manager**. Expected: PASS for admin/director/DM/RM/PM. NOT_APPLICABLE for HR/employee/dual_role.

---

### J-06 — PM bulk-reassigns 4 positions
Persona: **project_manager**. Expected: PASS for admin/director/DM/RM/PM. NOT_APPLICABLE for HR/employee/dual_role.

---

### J-07 — PM approves a submitted timesheet
Persona: **project_manager**. Blocked by J-02. Expected: PASS for admin/director/DM/PM. NOT_APPLICABLE for HR/RM/dual_role. **FAIL_EXPECTED for employee** (must be denied).

---

### J-08 — PM views project pulse
Persona: **project_manager**. Expected: PASS for admin/director/DM/RM/PM. NOT_APPLICABLE for HR/employee/dual_role.

---

### J-09 — RM runs auto-match candidates
Persona: **resource_manager**. Expected: PASS for admin/director/DM/RM/PM/dual_role. NOT_APPLICABLE for HR/employee.

---

### J-10 — RM proposes a candidate
Persona: **resource_manager**. Blocked by J-09. Expected: PASS for admin/director/DM/RM/PM/dual_role. NOT_APPLICABLE for HR/employee.

---

### J-11 — RM views the bench
Persona: **resource_manager**. Expected: PASS for admin/director/DM/HR/RM/dual_role. NOT_APPLICABLE for PM/employee.

---

### J-12 — HR runs HR action cards
Persona: **hr_manager**. Expected: PASS for admin/director/HR/dual_role. NOT_APPLICABLE for DM/RM/PM/employee.

---

### J-13 — HR bulk-reassigns 6 people across org units
Persona: **hr_manager**. Expected: PASS for admin/director/HR/dual_role. NOT_APPLICABLE for DM/RM/PM/employee.

---

### J-14 — HR configures a leave policy
Persona: **hr_manager**. Expected: PASS for admin. **FAIL_EXPECTED for hr_manager** (leave-policy admin is currently ADMIN_ROLES only — confirmed denial keeps the surface protected). NOT_APPLICABLE for director/DM/RM/PM/employee/dual_role.

---

### J-15 — Director views portfolio radiator
Persona: **director**. Expected: PASS for admin/director/DM. NOT_APPLICABLE for HR/RM/PM/employee/dual_role.

---

### J-16 — Director drills anomaly to underlying positions
Persona: **director**. Expected: PASS for admin/director. NOT_APPLICABLE for everyone else.

---

### J-17 — Director runs CPI what-if scenario
Persona: **director**. Expected: PASS for admin/director. NOT_APPLICABLE for everyone else.

---

### J-18 — DM views team conflicts queue
Persona: **delivery_manager**. Expected: PASS for admin/director/DM. NOT_APPLICABLE for HR/RM/PM/employee/dual_role.

---

### J-19 — DM escalates a rejection
Persona: **delivery_manager**. Expected: PASS for admin/director/DM. NOT_APPLICABLE for HR/RM/PM/employee/dual_role.

---

### J-20 — DM confirms an escalation
Persona: **delivery_manager**. Blocked by J-19. Expected: PASS for admin/director/DM. NOT_APPLICABLE for HR/RM/PM/employee/dual_role.

---

### J-21 — Admin runs the setup wizard
Persona: **admin**. Expected: PASS for admin only. NOT_APPLICABLE for everyone else.

---

### J-22 — Admin defines a custom role preset
Persona: **admin**. Expected: PASS for admin only. NOT_APPLICABLE for everyone else.

---

### J-23 — Admin configures SSO
Persona: **admin**. Expected: PASS for admin only. NOT_APPLICABLE for everyone else.

---

### J-24 — Admin views the audit log
Persona: **admin**. Expected: PASS for admin/director/HR/dual_role. NOT_APPLICABLE for DM/RM/PM/employee.

---

### J-25 — Employee uses /me workspace
Persona: **employee**. Expected: PASS for every role.

---

### J-26 — Employee endorses a peer's skill
Persona: **employee**. Expected: PASS for every role.

---

### J-27 — PM exports a budget report
Persona: **project_manager**. Expected: PASS for admin/director/DM/RM/PM. NOT_APPLICABLE for HR/employee/dual_role.

---

### J-28 — PM views forensics
Persona: **project_manager**. Expected: PASS for admin/director/DM/PM. NOT_APPLICABLE for HR/RM/employee/dual_role.

---

### J-29 — RM saves a planner scenario
Persona: **resource_manager**. Expected: PASS for admin/director/DM/RM/PM/dual_role. NOT_APPLICABLE for HR/employee.

---

### J-30 — RM applies a planner scenario
Persona: **resource_manager**. Blocked by J-29. Expected: PASS for admin/director/DM/RM/PM/dual_role. NOT_APPLICABLE for HR/employee.

---

## Total cell budget

- 30 journeys x 8 roles = **240 cells**
- Of those, ~16 are explicit `FAIL_EXPECTED` or `NOT_APPLICABLE` for specific personas baked into the matrix.
- The gate counts `PASS`-expected cells only and requires 100% observed pass.

## How QA uses the checklist UI

1. Log in as admin and navigate to `/admin/v2-soak-checklist`.
2. Pick or create a session id (e.g. `2026-06-08-pre-c0`).
3. Walk each journey on `https://deliverit-test-v2.agentic.uz` using the per-role test accounts above.
4. Mark each cell `PASS` / `FAIL` / `BLOCKED` — `NOT_APPLICABLE` cells are pre-filled and read-only.
5. The exit-gate summary at the top updates live: cutover is green only when every `PASS`-expected cell is observed `PASS` and every `FAIL_EXPECTED` cell is observed `FAIL`.
