# EPIC A — Budget Edit & EVM Reconnect (decomposition)

**Status:** in progress (depth-first). Priority P0, effort M. **Branch:** `feat/epic-a-budget-edit`. **Analysis:** `../E1-budget.md`.

## Job-to-be-done
> When I run a project, I need to **set / adjust its budget** (BAC = CAPEX + OPEX for a fiscal year) right from the Money tab, so CPI / EAC / variance become real — without hunting for a "budget admin" surface that doesn't exist.

**Regression:** the V2 Money tab (`MoneyPanel`) shows BAC **"not set"** with no edit affordance; the only set-budget form (`BudgetTab`) is dead code under dsRefresh, and the `/budget` admin surface the code points to was never built.

## Personas
- **Project / Delivery Manager** — sets + reforecasts the project budget (primary editor; `BUDGET_ROLES`).
- **Director / Admin** — approves budget-change requests; portfolio view.

## User stories
1. As a PM/DM, when BAC is "not set" I can **set the budget** (fiscal year + CAPEX + OPEX) from the Money tab.
2. As a PM/DM, I can **edit** the existing budget.
3. *(System)* After a budget save, **EVM recomputes** (CPI/EAC/EV/AC) so the Money tab + Radiator Budget quadrant stop showing stale seeded values.

## Atomic items
| # | Item | Layer | Status |
|---|------|-------|--------|
| A1 | `BudgetEditForm` component (fiscal year + CAPEX + OPEX; reuse BudgetTab field shape) → `upsertProjectBudget` | FE | ◧ |
| A2 | `MoneyTab`: extract `loadDashboard` (refetch), toggle the form, refetch + close on save | FE | ◧ |
| A3 | `MoneyPanel`: "Set / Edit budget" button on the BAC tile (`onEditBudget` prop) | FE | ◧ |
| A4 | **EVM reconnect** — call `EvmComputationService.recomputeForProject` inside `FinancialService.upsertProjectBudget` (best-effort, try/catch). Server-side, so it runs with the budget write and avoids the EXEC-only recompute-endpoint role gap for PMs. | BE | ◧ |
| A5 | Tests — `MoneyPanel.test` (BAC tile + button; drop the bare "not set" assert), `BudgetEditForm` / `MoneyTab` flow, BE service test asserting recompute is invoked on upsert | FE+BE | ◧ |
| A6 | *(deferred → EPIC G)* persist `vendorBudget` + `currencyCode`; XLSX budget import; EVM auto-refresh cron | — | ⏳ |

## Design / UX
- BAC tile (`MoneyPanel`) gains a small "Set budget" (when unset) / "Edit" (when set) text-button beneath the value, ≤200px from the BAC number (UX Law 4).
- Clicking reveals an inline budget form on the Money tab (toggle, not a route change — UX Law 3 no context loss). Reuses the BudgetTab field layout (FY / CAPEX / OPEX number inputs + Save/Cancel).
- On save: optimistic close + dashboard refetch; the recompute happens server-side so EVM-derived KPIs refresh on the refetch.

## Acceptance criteria
- From the Money tab, BAC can be set when unset and edited when set; the new BAC + EVM-derived CPI/EAC reflect after save.
- PM-role save works end-to-end (no EXEC-role 403 on the EVM step).
- FE+BE `tsc` clean; tests green.

## Inventory validation
`action-inventory.json` lists "Money tab" KPI tiles + `/api/projects/:id/budget` (PUT) but **no reachable budget-set action** on the V2 Money surface. This epic adds it. Ledger: **projects.budget.upsert + evm.recompute(server-side) → wired to Money-tab UI.**
