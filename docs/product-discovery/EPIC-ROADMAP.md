# DeliveryCentral — Next-Phase Epic Roadmap

_Synthesized from 7 code-grounded product analyses. Target market: CIS / Uzbekistan banks (agentic.uz), running with the V2 (`dsRefresh`) surface forced on via `VITE_FORCE_FLAGS_ON`._

## Executive summary

Three themes define the next phase:

1. **Recover regressed/dead features that are already 80% built.** The V2 Money tab lost its budget-edit path (blanking the whole EVM/CPI finance layer), and a fully-built Client backend has no UI. These are the fastest, highest-value wins.
2. **Turn convincing integration skeletons into working connectors.** OIDC login and outbound SMTP are production-real, but directory sync (M365/LDAP), Jira PPM, and JSM case sync are "configured/green" shells that move zero data because their source adapters are in-memory stubs or unwired. The hard reconciliation engine already exists — the work is integration seams.
3. **Win the CIS/bank market.** 1C HRIS sync, budget import from 1C/Excel, and self-hosted (Data Center) support are table-stakes for agentic.uz, not nice-to-haves.

## Epic table

| Epic | Priority | Effort | Depends on | Value rationale (1-line) |
|------|----------|--------|------------|--------------------------|
| **A — Budget Edit & EVM Reconnect** | P0 | M | — | Recovers a live V2 regression; relights the dormant EVM/CPI/EAC/Radiator finance layer with mostly-existing code. |
| **B — Client Management UI** | P0 | S | — | Best value-to-effort: UI clone over a fully-built backend; unblocks client→rate-card→project onboarding. |
| **C — Planning Toolbar + Workspace Density** | P1 | L | — | FE-only; fixes scattered Plan controls + hidden Gantt + wasted space on 4 live queues. |
| **D — Real Directory Sync (M365 Graph + LDAP + OIDC governance)** | P1 | L | — | Keystone identity engine; makes hollow directory sync real and OIDC bank-review-ready. |
| **E — Jira PPM + JSM Case Sync** | P1 | L | D | Finishes the wiring so integrations sync real data; closes the JSM case→ticket→status loop. |
| **F — 1C (1С:Предприятие) HRIS Adapter** | P1 | L | D | 1C is the dominant CIS HRIS; removes the Day-1 manual-entry blocker via the generalized M365 engine. |
| **G — Budget/Parameter Import + EVM cron** | P2 | L | A | Bank-onboarding unlock: bulk-import budgets from 1C/Excel through A's governed write path; auto-refresh EVM. |
| **H — Custom Integration Connector Builder** | P3 | XL | D, E, F | Strategic self-serve iPaaS-lite; built last on proven seams, MVP hard-gated to outbound REST. |

**Priority key:** P0 = recover/unblock now · P1 = market-critical for bank pilots · P2 = onboarding scale · P3 = strategic runway.
**Effort key:** S < M < L < XL.

## Recommended build sequence

The order is driven by (1) regression/dead-feature recovery, (2) value-to-effort, then (3) the shared-engine dependency chain.

### Wave 1 — Recover & unblock (parallel, ship immediately)
- **EPIC B (S)** and **EPIC A (M)** — independent P0s. B is the single best value-to-effort item; A recovers a live finance regression. Both are quick-win-rich.
- **EPIC C (L)** can run in parallel as a design-led FE track — no backend coupling, improves the surfaces users already see.

### Wave 2 — Identity foundation (the keystone)
- **EPIC D** is the engine that EPICs E and F both depend on. Do its **S** governance/honesty fixes first (bank-review-critical, no new infra), then the **L** Graph adapter and **M** LDAP wiring. Build D before E and F.

### Wave 3 — Vertical connectors (parallelizable after D)
- **EPIC E (Jira/JSM)** and **EPIC F (1C HRIS)** both extend D's reconciliation engine and can proceed in parallel.
- **Prioritize F** if agentic.uz confirms 1C as the HR system of record. **Pull a Data Center variant into E early** if the pilot is self-hosted — Cloud-only adapters are otherwise a market blocker.

### Wave 4 — Onboarding scale + automation
- **EPIC G** follows A so import reuses A's governed write path (and must batch/suppress the approval flood). Pairs naturally with F — both serve the same 1C/Excel system-of-record onboarding story.

### Wave 5 — Platform runway (last)
- **EPIC H** is correctly final: net-new, high-security-surface, and should only be built after D/E/F prove the seam patterns it generalizes. Hard-gate the MVP to outbound REST so it ships instead of sprawling into a full iPaaS.

```
Wave 1:  [A]  [B]  [C]        (all parallel, P0/P1, no deps)
Wave 2:        [D]            (identity engine — gates E, F, H)
Wave 3:     [E]   [F]         (parallel, both on D's engine)
Wave 4:        [G]            (after A)
Wave 5:        [H]            (after D, E, F)
```

## Quick wins (high value, low effort — schedule first)

1. **Client Registry page (S)** — Clone `VendorRegistryPage` → `ClientRegistryPage` at `/admin/clients` (list + inline-create + activate/deactivate + `PersonSelect` account-manager). Backend, FE API, and 9 seeded clients already exist. _Lowest-risk item in the roadmap._
2. **Client actor-audit fix (2 lines)** — Thread the principal into `client.controller.ts` create/update so `createdByPersonId`/`updatedByPersonId` populate (closes a known D-103-write-path hole).
3. **Budget edit drawer (S–M)** — Inline "Set/Edit budget" on the `MoneyPanel` BAC tile reusing `BudgetTab`'s form; save via the existing `PUT /projects/:id/budget`, then `POST /projects/:id/evm/recompute` and refetch. Fixes the reported regression and reconnects dormant EVM.
4. **OIDC governance hardening (S)** — Enforce `sso.autoProvisionUsers` on login (stop silent account creation), map IdP groups/roles claim → platform roles, and replace M365's hardcoded `configured`/`reachable:true` status with a real probe. Makes the shipped SSO story bank-review-ready and kills a false-green operator trap — no new infra.
5. **Plan toolbar + Gantt-first (part of C)** — Consolidate Plan-tab create actions into one `PlanToolbar` and promote the Gantt to the first, expanded section. Removes duplicate/ambiguous create buttons and surfaces the schedule (UX Law 4) with no backend changes.

## Cross-cutting risks & gates

- **False-green integrations** — M365/Jira status report success against empty in-memory adapters today; fix observability (D/E Phase 1) before any acceptance sign-off.
- **Cloud-only vs Data Center** — CIS/Uzbek banks run self-hosted Jira/JSM/1C; confirm the agentic.uz topology early, as it reorders E and F internals.
- **New package approvals** — `@azure/msal-node` + Graph client (D), `@nestjs/schedule` (A/G cron), and any connector-builder deps need approval per the package policy.
- **Migration discipline** — JSM `CaseRecord` columns (E) and connector models (H) require idempotent migrations + DM-R-13 schema-hash refresh; half-applied migrations have broken staging before.
- **Test-contract changes** — A flips the `not set` MoneyPanel assertion; C removes in-card/header create buttons. Update fixtures in the same change; verify no V2 soak journey depends on the old behavior.
- **Security surface (H)** — A self-serve outbound caller is an SSRF/exfiltration vector; mandate SafeURL + admin allowlist + field-allowlist + a reviewed credential vault before flag promotion.
