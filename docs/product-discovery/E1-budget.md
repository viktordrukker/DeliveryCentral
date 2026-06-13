---
area: "Budget & project-parameter import/edit"
effort: L
---

# Budget & project-parameter import/edit

**Effort:** L

## Current state

The ProjectBudget model (prisma/schema.prisma:1965-1998) carries 11 financial fields: capexBudget, opexBudget (both NOT NULL, default 0), and nullable vendorBudget, earnedValue, actualCost, plannedToDate, eac, capexCorrectPct, currencyCode — plus fiscalYear, version, and actor-audit columns. Unique key is (projectId, fiscalYear).

SETTING/EDITING A BUDGET — partial, flagged-off in the V2 target state:
- Backend endpoint EXISTS and is fully built: PUT /api/projects/:id/budget → ProjectBudgetController.upsertBudget (src/modules/financial-governance/presentation/budget.controller.ts:61-81), guarded by BUDGET_ROLES (admin, project_manager, delivery_manager, director — role-presets.ts:78-83). FE client exists: upsertProjectBudget in frontend/src/lib/api/project-budget.ts:43-48.
- CRITICAL LIMITATION: the upsert DTO (UpsertProjectBudgetDto, financial.dto.ts:68-80) and the repository upsert (financial.repository.ts:130-160) only write capexBudget + opexBudget. vendorBudget, currencyCode, and all EVM fields are NEVER writable through this path.
- The only UI to set a budget is the "Set Budget" SectionCard form in BudgetTab.tsx:175-197 (fiscalYear + CAPEX + OPEX number inputs + Save). But BudgetTab is ONLY rendered when feature flag dsRefresh is OFF and via legacy ?tab=budget (ProjectDetailPage.tsx:321). dsRefresh default is false (feature-flags.ts:199) but V2 is the shipping direction.
- In the V2/dsRefresh-ON path, the Money tab is MoneyTab.tsx → MoneyPanel.tsx, which renders the BAC KPI tile showing "not set" (MoneyPanel.tsx:99-105) with NO edit affordance. This is the user-reported bug, and it's a locked-in contract: MoneyPanel.test.tsx:95 asserts the literal "not set" text. The MoneyTab.tsx:38-43 comment claims budget admin "moved to the dedicated /budget admin surface" — that surface DOES NOT EXIST (no /budget route in router.tsx or route-manifest.ts).

IMPORTING BUDGETS/PARAMS — absent: No XLSX/CSV/PPM budget import exists anywhere. frontend/src/lib/export.ts is export-only (SheetJS write path); there is no read/parse path for budgets. No import endpoint on the backend.

PROJECT CREATE/EDIT LIFECYCLE — partial: CreateProjectRequestDto (create-project.request.ts) captures name, dates, PM/DM, priority, domain, projectType, engagementModel, client, tags, techStack — NO budget/financial fields. Budget is a separate post-create step. Editing post-create (PATCH /projects/:id, projects.controller.ts:290) only allows name, description, status, projectManagerId, deliveryManagerId (inline UpdateProjectRequestDto, projects.controller.ts:60-66) — no charter/financial params.

BUDGET → CAPEX/EVM FEED — built but UI-orphaned: EvmComputationService (evm-computation.service.ts) computes AC (Σ approved timesheet hours × effective PersonCostRate), EV (Σ milestone weight × progress × BAC), PV, EAC = BAC×(AC/EV), capexCorrectPct, and persists them to ProjectBudget. CPI/budgetStatus on ProjectDetails derive from these (project-directory-query.service.ts:197-212: cpi = earnedValue/actualCost; budgetStatus from EAC vs BAC). Trigger endpoints POST /projects/:id/evm/recompute and POST /admin/evm/recompute-all exist (evm.controller.ts, EXEC_ROLES) but have ZERO frontend callers — EVM only refreshes if an operator hits the API directly, and no cron exists (deferred per service docstring). So in practice CPI/EAC stay at their seeded values. Budget-change governance is fully built: auto-trigger creates a PENDING BudgetApproval on initial-budget-create or |variance| ≥ 10% (budget-approval-auto-trigger.service.ts; threshold PlatformSetting finance.budgetApproval.autoTriggerVariancePercent), request/approve/reject endpoints wired (budget.controller.ts:111-191), director-only deciders. CPI what-if projection is read-only and built end-to-end (cpi-what-if.service.ts, CpiWhatIfCard.tsx).

## Gaps

- No budget edit affordance on the V2 Money tab — MoneyPanel shows BAC 'not set' with no way to set it; the only set-budget form (BudgetTab) is dead code in the dsRefresh-ON target state
- No dedicated /budget admin surface despite MoneyTab.tsx claiming budget administration moved there — the route does not exist
- vendorBudget and currencyCode on ProjectBudget are read by 4+ consumers (portfolio-finance-summary, spc.service, dashboard rollups) but writable by NO API or UI — only the seed sets them
- No budget/parameter IMPORT path at all (no XLSX/CSV/PPM ingest) — blocks bank onboarding where budgets live in 1C/Excel/existing PPM tools
- EVM recompute endpoints (per-project + portfolio) have zero UI callers and no cron — CPI/EAC/EV/AC never refresh automatically, so the Money tab and Radiator Budget quadrant show stale seeded numbers in production
- Budget is per-fiscalYear but there is no UI to view/manage budgets across fiscal years or to roll forward — only current UTC year is surfaced (financial.service.ts:381)
- Multi-currency is modelled (currencyCode FK to Currency, FxRate service exists from F-7) but the budget edit path is currency-blind — no currency selector, amounts are bare numbers
- EVM milestone weighting is equal-share (1/N) because schema has no weightPct column (evm-computation.service.ts:152) — EV is coarse for projects with uneven milestones
- Project create/edit captures no financial or charter-money params; budget is always a disconnected second step, easy to skip (every project starts BAC-unset)
- No bulk/portfolio budget entry — setting budgets for 40 seeded projects (or a bank's full portfolio) is one-project-at-a-time

## Product definition

JOB-TO-BE-DONE: "When I stand up or run a delivery project, I need to set its financial baseline (CAPEX/OPEX/vendor budget, currency, fiscal year) and keep it current, so the platform can compute CPI/EAC/variance and flag projects drifting over budget — without me re-keying numbers that already live in our PPM tool or finance spreadsheets."

PERSONAS:
- Project Manager / Delivery Manager (primary editor): owns a project's budget, sets the initial BAC, requests reforecasts. Needs a fast in-context edit on the Money tab.
- Director / Admin (approver + portfolio): decides budget-change requests, wants portfolio-wide budget coverage and bulk import for onboarding.
- Finance/PMO operator (bank context): holds the authoritative budgets in 1C/Excel/existing PPM; needs an import so the platform mirrors the system of record rather than becoming a re-keying chore.

USER VALUE: CPI/EAC/variance signals are only as good as the BAC behind them. Today every project starts BAC-unset and there's no V2 path to fix it, so the entire EVM/Radiator Budget layer renders empty or stale. Closing this makes the finance story real and is a hard gate for bank pilots (agentic.uz / CIS), where budgets are governed and must reconcile to the finance system of record.

MINIMAL VIABLE SCOPE (MVP):
1. Restore a budget edit affordance on the V2 Money tab — an inline "Set/Edit budget" action on the BAC tile that opens a drawer/modal writing capexBudget + opexBudget + currencyCode + fiscalYear via the existing PUT endpoint, then auto-recomputes EVM and refreshes. Reuses BudgetTab's proven form logic + ConfirmDialog; routes governance through the already-built auto-trigger.
2. Extend UpsertProjectBudgetDto + repository to persist vendorBudget and currencyCode (fields already in schema, read by consumers, just not writable).
3. Wire an EVM recompute trigger into the budget-save flow (call recomputeForProject after upsert) so CPI/EAC stop being stale.

PHASE 2 (import): XLSX budget import using approved SheetJS package — upload a workbook (project key + fiscalYear + capex + opex + vendor + currency), preview/validate rows, map to projects, dry-run diff, then bulk-upsert through the same governed path. This is the "Mythos-grade" piece and the bank-onboarding unlock.

## Recommendation

Phase 1 (S–M, ship first): Reinstate a budget edit affordance in the V2 Money surface. Add a "Set / Edit budget" button to MoneyPanel's BAC tile that opens a drawer reusing BudgetTab's form (fiscalYear + CAPEX + OPEX + currency selector). On save: call existing PUT /projects/:id/budget, then POST /projects/:id/evm/recompute, then refetch dashboard + ProjectDetails (UX Law 3 — stay in context, success toast). Update MoneyPanel.test.tsx away from asserting bare 'not set' toward asserting the set-budget CTA. This alone fixes the reported bug and reconnects the whole EVM chain. Effort S if currency is deferred, M with currency.

Phase 2 (M): Make vendorBudget + currencyCode first-class — extend UpsertProjectBudgetDto (financial.dto.ts:68-80) and financial.repository.ts:130-160 upsert (create+update) to persist them; add currency selector + vendor budget input to the drawer. Removes the read-but-never-written orphan fields.

Phase 3 (M): Auto-refresh EVM — add a nightly cron (vet @nestjs/schedule, already flagged as the intended home in evm-computation.service.ts:41) calling recomputeAllProjects, and trigger per-project recompute on budget save and on timesheet approval. Kills stale-CPI risk without operators hitting raw endpoints.

Phase 4 (L, bank unlock): XLSX/CSV budget + parameter import. New /admin/budget-import (or a Money-tab portfolio entry) using SheetJS read path: upload → parse → validate (project match by publicId/name, fiscalYear, non-negative amounts, valid currency) → preview diff table → confirm → bulk upsert through the governed service (each row flows the auto-trigger). Add a downloadable template. This serves the CIS/Uzbekistan bank case where budgets live in 1C/Excel.

Phase 5 (M, optional): Capture an optional initial budget in the project create flow so projects don't start BAC-unset, and a portfolio budget grid for multi-project/multi-FY entry.

Sequencing rationale: Phase 1 is the highest value-to-effort — it restores a regressed capability and lights up dormant EVM compute. Phases 2–3 harden the data. Phase 4 is the strategic differentiator for bank onboarding and should be scoped after the edit path is solid so import reuses the same validated write path.

## Dependencies

- Existing PUT /api/projects/:id/budget endpoint + upsertProjectBudget service/repo (extend, don't rebuild)
- EvmComputationService.recomputeForProject + EVM controller (wire to UI / cron)
- BudgetApprovalAutoTriggerService + DecideBudgetChangeService governance chain (reuse as-is)
- feature-flags.ts dsRefresh flag (Phase 1 must work in dsRefresh-ON state since that is the V2 target)
- Currency model + FxRate service (F-7 sprint) for multi-currency budget entry
- SheetJS (xlsx) — already an approved package, currently export-only; Phase 4 adds the read path
- @nestjs/schedule — NOT yet vetted/installed; required for Phase 3 cron (needs approval per CLAUDE.md package policy)
- ProjectBudget schema weightPct column (absent) — only needed if EV milestone weighting is improved beyond equal-share
- BUDGET_ROLES / BUDGET_DECIDE_ROLES presets (RBAC already correct)
- MoneyPanel.test.tsx + MoneyTab.test.tsx contracts must be updated, not just extended (they assert the 'not set' no-edit state today)

## Risks

- Updating MoneyPanel.test.tsx 'not set' assertion is a behavioral contract change — must confirm no other V2 soak journey (v2-soak-journeys.ts) depends on the no-edit Money tab before flipping
- Wiring auto-EVM-recompute into the save path can surface previously-hidden over-budget RED states across the seeded portfolio — expected but may alarm during demos; gate or communicate
- vendorBudget/currencyCode are read by portfolio rollups (portfolio-finance-summary.service.ts) — making them writable changes aggregate totals; verify no rollup assumes them constant/zero
- Budget-import bulk upsert through the auto-trigger could create a flood of PENDING BudgetApproval rows on first bank onboarding (every initial-budget create triggers one) — need a bulk/seed mode that suppresses or batches approvals
- EVM equal-weight milestone EV (1/N) understates/overstates EV for uneven projects — CPI shown after recompute may not match finance's own EVM; flag as known approximation until weightPct lands
- Currency-blind today: introducing a currency selector without enforcing it on existing rows risks mixed-currency portfolio sums; need a default-currency platform setting and migration of seeded rows
- @nestjs/schedule is unvetted — Phase 3 cron blocked on package approval; interim is a save-time + timesheet-approval recompute trigger only
- dsRefresh flag is default-OFF but the V2 cutover (C0 flip) is imminent per memory — Phase 1 must target dsRefresh-ON, or the fix lands in dead (legacy) code
- Bank/finance system-of-record (1C/Excel) reconciliation expectations may exceed a one-shot import — recurring sync may be requested, expanding scope toward an integration epic

## Claude Design prompt

```
Design a "Set / Edit project budget" drawer for DeliveryCentral's V2 Money tab (project detail page), matching the existing design system. Context: the Money tab currently shows a 6-tile EVM KPI strip where the first tile is "Baseline (BAC)" showing "not set" when no budget exists — today there is no way to set it. Add an edit affordance.

Requirements:
- Trigger: a small "Set budget" / "Edit" pencil action on the BAC KPI tile (visible only to roles admin / project_manager / delivery_manager / director). When BAC is unset, show a prominent "Set budget" CTA in the tile per UX Law 2 (no dead-end); when set, show an inline "Edit" affordance within 200px of the BAC value (UX Law 4).
- Drawer/modal contents: Fiscal Year (number, default current year), Currency (select, default tenant currency), CAPEX Budget (currency-formatted number input), OPEX Budget, Vendor Budget (optional). Show a live computed "Total BAC = CAPEX + OPEX + Vendor". Pre-fill from the existing budget when editing (UX Law 6 — no re-keying).
- Governance note inside the drawer: a subtle info line "Changes ≥ 10% (or the first budget) create a budget-change request for Director approval." 
- Actions: primary "Save budget", secondary "Cancel". On save, stay on the Money tab and show a success toast with a next-action suggestion (e.g., "Budget saved · EVM recomputed · View variance"). Do not navigate away (UX Law 3).
- Use design tokens only: var(--color-surface) background, var(--color-border), var(--shadow-modal), var(--color-text)/var(--color-text-muted), var(--color-status-*) for the over-budget hint. Use the .field / .field__control / .field__label form pattern and the Button (primary/secondary) + Money + Pct DS components. Numeric inputs right-aligned, tabular-nums.
- States: loading, save-in-progress (disabled primary, "Saving…"), inline error, and a validation state (amounts ≥ 0, fiscal year ≥ 2020). 
- Also sketch an optional Phase-2 entry point: a "Import budgets (XLSX)" link in the project list / portfolio header that leads to an upload → preview/diff → confirm flow (template download, per-row validation, map-to-project, dry-run diff table, bulk apply).
Deliver: the edit drawer as the focal component, plus a thumbnail of the import preview screen. Keep it bank-grade, dense, and consistent with the existing dashboard grammar.
```

---

# BA Analysis — Budget & Project-Parameter Import/Edit (Mythos-grade deep-dive)

## 1. Current state (code-grounded)

### 1.1 Data model — `ProjectBudget`
`prisma/schema.prisma:1965-1998`. Keyed `@@unique([projectId, fiscalYear])`. Fields:

| Field | Type | Writable today? | Read by |
|---|---|---|---|
| `capexBudget` | Decimal, NOT NULL, default 0 | YES (PUT budget) | EVM, dashboard, SPC, BAC |
| `opexBudget` | Decimal, NOT NULL, default 0 | YES (PUT budget) | same |
| `vendorBudget` | Decimal? | **NO — seed only** | `portfolio-finance-summary.service.ts:105`, `spc.service.ts:116`, BAC rollups |
| `earnedValue` | Decimal? | only `EvmComputationService` | `cpi` (project-directory-query) |
| `actualCost` | Decimal? | only `EvmComputationService` | `cpi` |
| `plannedToDate` | Decimal? | only `EvmComputationService` | EVM/SPC |
| `eac` | Decimal? | only `EvmComputationService` | `budgetStatus` |
| `capexCorrectPct` | Decimal? | only `EvmComputationService` | radiator capex compliance |
| `currencyCode` | VarChar(3)? FK→Currency | **NO — seed only** | finance rollups |
| `fiscalYear` | Int | YES | partitions everything |

Governance child: `BudgetApproval` (`schema.prisma:3085`).

### 1.2 Setting / editing a budget — **partial, regressed in V2**
- **Backend (fully built):** `PUT /api/projects/:id/budget` → `ProjectBudgetController.upsertBudget` (`src/modules/financial-governance/presentation/budget.controller.ts:61-81`), guarded `BUDGET_ROLES` = admin, project_manager, delivery_manager, director (`role-presets.ts:78-83`). FE client `upsertProjectBudget` (`frontend/src/lib/api/project-budget.ts:43-48`).
- **Hard limitation:** `UpsertProjectBudgetDto` (`financial.dto.ts:68-80`) and repo upsert (`financial.repository.ts:130-160`) write **only capex + opex**. `vendorBudget`, `currencyCode`, and all EVM fields are not writable through any API.
- **UI (flagged-off / dead in target state):** the only set-budget form is the collapsible "Set Budget" card in `BudgetTab.tsx:175-197` (fiscalYear + CAPEX + OPEX + Save). `BudgetTab` renders **only when `dsRefresh` is OFF**, via legacy `?tab=budget` (`ProjectDetailPage.tsx:321`). `dsRefresh` default = false (`feature-flags.ts:199`) but V2 (dsRefresh-ON) is the shipping direction (per memory: C0 flip is the last step).
- **V2 Money tab has no edit:** with `dsRefresh` ON, `?tab=money` → `MoneyTab.tsx` → `MoneyPanel.tsx`. The BAC tile renders **"not set"** (`MoneyPanel.tsx:99-105`) with **no edit affordance**. This is the reported bug, and it's a locked contract — `MoneyPanel.test.tsx:95` asserts the literal text `not set`.
- **Phantom surface:** `MoneyTab.tsx:38-43` claims budget admin "moved to the dedicated /budget admin surface." **No such route exists** (absent from `router.tsx` and `route-manifest.ts`). The capability was removed from the canvas without a replacement.

### 1.3 Importing budgets/params — **absent**
No XLSX/CSV/PPM budget import. `frontend/src/lib/export.ts` is SheetJS **write-only**; there is no parse/read path and no import endpoint. Bank customers holding budgets in 1C/Excel/existing PPM have no ingest.

### 1.4 Project create/edit lifecycle — **partial**
- `CreateProjectRequestDto` (`create-project.request.ts`): name, dates, PM/DM, priority, domain, projectType, engagementModel, client, tags, techStack. **No financial fields.** Budget is always a disconnected second step → every project starts BAC-unset.
- Post-create edit `PATCH /projects/:id` (`projects.controller.ts:290`) uses an inline `UpdateProjectRequestDto` (`projects.controller.ts:60-66`) limited to name, description, status, projectManagerId, deliveryManagerId. No charter/financial params editable.

### 1.5 Budget → CAPEX / EVM feed — **built but UI-orphaned**
- `EvmComputationService` (`evm-computation.service.ts`): AC = Σ approved `TimesheetEntry.hours` × effective `PersonCostRate`; EV = Σ milestone (equal 1/N weight) × progress × BAC; PV; EAC = BAC×(AC/EV); `capexCorrectPct`. Persists the 5 EVM columns + bumps `version`; never overwrites capex/opex/vendor/currency.
- Derivation: `cpi = earnedValue/actualCost`, `budgetStatus` from EAC vs BAC (`project-directory-query.service.ts:197-212`). These feed the V2 Money strip (`MoneyTab.tsx:76-78`).
- **Orphan:** trigger endpoints `POST /projects/:id/evm/recompute` and `POST /admin/evm/recompute-all` (`evm.controller.ts`, EXEC_ROLES) have **zero FE callers** (grep clean). No cron (deferred, `evm-computation.service.ts:41`). Net effect: in production CPI/EAC/EV/AC stay at seeded values; the Money strip and Radiator Budget quadrant are stale.
- Governance (fully built): auto-trigger creates a PENDING `BudgetApproval` on initial-budget-create or |variance| ≥ 10% threshold (`budget-approval-auto-trigger.service.ts`; PlatformSetting `finance.budgetApproval.autoTriggerVariancePercent`); request/approve/reject endpoints wired (`budget.controller.ts:111-191`); director/admin deciders; self-approval blocked in UI (`BudgetTab.tsx:243-249`).
- CPI what-if: read-only, end-to-end (`cpi-what-if.service.ts`, `CpiWhatIfCard.tsx`); never persists.

## 2. Gaps (ranked)
1. **No budget edit on the V2 Money tab** — BAC "not set", no CTA; the only working form is dead code under `dsRefresh`-OFF.
2. **No /budget admin surface** despite the code claiming one exists.
3. **`vendorBudget` + `currencyCode` are read-but-never-written** (only the seed sets them).
4. **No budget/param import** (XLSX/CSV/PPM) — bank-onboarding blocker.
5. **EVM never auto-refreshes** (no UI trigger, no cron) → stale CPI/EAC in prod.
6. **Single-FY surface only** (current UTC year, `financial.service.ts:381`); no multi-FY view or roll-forward.
7. **Currency-blind edit path** even though Currency/FxRate exist (F-7).
8. **Equal-weight EV (1/N)** — no `weightPct` column; coarse EV.
9. **No financial capture at project create** → BAC-unset by default.
10. **No bulk/portfolio budget entry** — one project at a time.

## 3. Product definition

**JTBD:** "When I stand up or run a delivery project, I need to set and maintain its financial baseline (CAPEX/OPEX/vendor, currency, fiscal year) so the platform computes CPI/EAC/variance and flags drift — without re-keying numbers already in our PPM/finance system."

**Personas:** PM/DM (primary editor, in-context Money-tab edit + reforecast requests); Director/Admin (approver + portfolio coverage + bulk import); Finance/PMO operator (system-of-record in 1C/Excel, needs import so the platform mirrors rather than re-keys).

**User value:** EVM signals are only as trustworthy as the BAC behind them. Today every project is BAC-unset with no V2 fix path, so the entire finance layer renders empty/stale. This is a hard gate for the CIS/Uzbekistan bank pilots (agentic.uz), where budgets are governed and must reconcile to finance.

**MVP scope:** (1) restore an inline Set/Edit-budget affordance on the V2 Money tab writing capex+opex+currency via the existing PUT, then auto-recompute EVM; (2) make vendorBudget+currencyCode writable; (3) trigger EVM recompute on save. **Phase 2:** XLSX import (the Mythos-grade, bank-onboarding piece) reusing the same governed write path.

## 4. Options & trade-offs

| Option | Pros | Cons |
|---|---|---|
| A. Re-expose `BudgetTab`'s form inside the V2 Money tab (drawer) | Fastest; reuses proven logic + governance; fixes reported bug | Must update test contracts; legacy form styling needs DS pass |
| B. Build a new `/budget` admin surface (fulfil the phantom route) | Matches the code's stated intent; portfolio-friendly | Higher effort; pulls budget edit away from where users look (Money tab) — violates UX Law 4 adjacency |
| C. Capture budget at project create only | Stops BAC-unset-by-default | Doesn't help existing projects; no reforecast/edit path |

**Recommendation:** A for the edit path (in-context, Law-4 compliant), plus a thin portfolio/import entry later (a slice of B's value) for bulk. C is a Phase-5 nicety.

## 5. Phased action list
- **Phase 1 (S–M):** Inline Set/Edit-budget drawer on `MoneyPanel` BAC tile (fiscalYear, capex, opex, currency). On save → PUT budget → `POST /projects/:id/evm/recompute` → refetch dashboard + ProjectDetails; success toast (Law 3). Update `MoneyPanel.test.tsx`/`MoneyTab.test.tsx` off the bare `not set` contract.
- **Phase 2 (M):** Extend `UpsertProjectBudgetDto` + repo upsert (create+update) to persist `vendorBudget` + `currencyCode`; add inputs/currency selector.
- **Phase 3 (M):** Auto-refresh EVM — recompute on budget save + timesheet approval now; nightly cron via `@nestjs/schedule` (needs package approval) calling `recomputeAllProjects`.
- **Phase 4 (L — bank unlock):** XLSX/CSV budget+param import. Upload → SheetJS parse → validate (project match, FY, ≥0 amounts, valid currency) → preview diff → confirm → bulk upsert through the governed service. Template download. Add a bulk/seed mode to avoid an approval flood.
- **Phase 5 (M, optional):** Optional initial budget in project-create; portfolio budget grid (multi-project / multi-FY).

## 6. Effort: **L** overall (Phase 1 alone is S–M; the import phase drives it to L).

## 7. Dependencies
Existing PUT budget endpoint + service/repo (extend); EvmComputationService + EVM controller; `dsRefresh` flag (target ON); Currency + FxRate (F-7) for multi-currency; SheetJS (approved, currently export-only); `@nestjs/schedule` (unvetted — Phase 3 cron); BUDGET_* RBAC presets (correct already); test contracts in `MoneyPanel.test.tsx`/`MoneyTab.test.tsx` (must change).

## 8. Risks
- Changing the `not set` test contract is a behavioral change — verify no V2 soak journey (`v2-soak-journeys.ts`) relies on the no-edit Money tab.
- Auto-recompute on save will surface real RED over-budget states across the seeded portfolio (expected; communicate for demos).
- Making vendorBudget/currencyCode writable changes portfolio rollups — verify no aggregate assumes them constant/zero.
- Bulk import via auto-trigger could flood PENDING BudgetApproval rows on first onboarding — need a batched/suppressed mode.
- Equal-weight EV may not match finance's own EVM — flag as approximation until `weightPct` lands.
- Currency-blind today — need a tenant default currency + migration of seeded rows to avoid mixed-currency sums.
- `@nestjs/schedule` unvetted — Phase 3 cron blocked on approval; interim is save-time/approval-time triggers.
- `dsRefresh` is default-OFF but C0 cutover is imminent — Phase 1 must target dsRefresh-ON or it lands in dead code.
- Banks may expect recurring 1C/Excel sync (not one-shot import) — could expand toward the integrations epic.

## 9. Open questions
- Is budget per-fiscalYear sufficient, or do banks need monthly/quarterly phasing (drives a new schedule table)?
- What is the system of record at agentic.uz banks — 1C, SAP, a PPM tool, or spreadsheets — and is one-shot import or recurring sync expected?
- Should the V2 Money-tab edit go through the **request-change/approval** flow always (governed) or allow a direct first-set for PMs with approval only on reforecast?
- Default tenant currency + handling of existing seeded `currencyCode`-null rows?
