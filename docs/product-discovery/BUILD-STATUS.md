# Build Status — epic-build loop (2026-06-13/14)

> **Alignment:** governed by [`docs/planning/ALIGNMENT-AND-DEVELOPMENT-LOOP.md`](../planning/ALIGNMENT-AND-DEVELOPMENT-LOOP.md) — the charter that reconciles this live epic loop with the historical `MASTER_TRACKER.md`, the guardrail ledger, and the development-loop protocol.

Single source of truth for where the depth-first epic build stands. Cadence: per-epic flag-gated PRs → merge to `main` → deploy to **v2-staging** (`deliverit-test-v2`) → never prod. Decisions: depth-first per epic; external integrations count as done when flag-gated + contract-tested. Inventory = `docs/qa/action-inventory.json` (branch `qa/v2-full-surface-2026-06-13`).

## ✅ Merged to `main` this session
| PR | Item |
|----|------|
| #692 | ProjectsPage status filter case-insensitive |
| #693 | CAPEX tab deactivated (pre-GA, flag-gated) + gap list |
| #694 | `/me?tab=time` empty-month empty-state (was endless "Loading…") |
| #695 | JQL suggestions don't open on render |
| #696 | Cases page scrolls (dropped clipping `viewport`) |
| #697 | Leave preview guarded against half-typed-date 400s |
| #698 | Home/dashboard never redirects to a flag-disabled dead-end |
| #700 | **EPIC B** — Client Management UI |
| #701 | **EPIC A** — Budget edit + EVM reconnect |
| #702 | Position lifecycle Advance CTAs |
| #703 | **EPIC D1** — OIDC auto-provision governance + IdP role mapping |
| #704 | Chunk-load resilience (`vite:preloadError` auto-reload) |
| #705 | Create-Case "Related Position" captions (names, not UUIDs) |
| #706 | **SC-7 keystone** — positions-list API name enrichment |
| #699 | docs — BA analyses + epic roadmap (A–H) |

## 🚀 Deployed to v2-staging
- Run 27474242140 — #693–#698 + B/A/position-CTA/D1.
- Run 27479620770 — #704 chunk-resilience + #705 Create-Case + #706 SC-7 keystone. **All shipped work is now live on v2.**

## Epic status (BA roadmap A–H + engineering epics)
| Epic | Status | Next |
|------|--------|------|
| **A** Budget Edit & EVM Reconnect | ✅ merged (#701) | — |
| **B** Client Management UI | ✅ merged (#700) | — |
| **C** Planning Toolbar + Workspace Density | 📐 spec'd (design-led) | Run the Claude Design prompt in `E7-planning-gantt-density.md`; then structural C1 PlanToolbar / C2 Gantt-headline. Backlog: `backlogs/EPIC-C-plan-toolbar-density.md`. |
| **D** Real Directory Sync | 🔶 D1 ✅ (#703); D2 verified-already-honest | **D3** concrete M365 Graph adapter (locate impl behind `M365DirectoryAdapter` port; real users/groups sync, flag-gated + contract-tested w/ mocked Graph). **D4** wire `src/shared/ldap/ldap-directory-adapter.ts` into the directory-sync flow + admin Run-sync/Test-connection. Backlog: `backlogs/EPIC-D-directory-sync.md`. |
| **E** Jira PPM + JSM sync | ⏳ not started (depends on D) | After D — extend the same engine. |
| **F** 1C HRIS adapter | ⏳ not started (depends on D) | Rides D's generalized directory engine. |
| **G** Budget/param import + EVM cron | ⏳ not started (depends on A) | XLSX import via SheetJS; persist vendorBudget/currencyCode (UpsertProjectBudgetDto+repo); EVM auto-refresh cron. |
| **H** Custom Integration Connector Builder | ⏳ not started (depends on D/E/F) | XL, last; **security-gate**: SafeURL + admin allowlist + field-allowlist + credential vault before flag promotion. |
| **SC-7** UUID→name captions | 🔶 keystone done (#706) + Create-Case (#705) | Backend enrichment now populates positions-list names → cmdk/Staffing Desk/Create-Case fixed at source. Audit remaining ~90 sites for other entity types (people/projects/cases) needing the same enrichment pattern. |
| **F-HEALTH-EMPTY** empty-project metrics → N/A | ⏳ not started (high-blast) | `radiator-scorers.ts` absent-signal scorers return non-null GREEN; make absent → null so `quadrantScore` yields N/A. Cascades into portfolio rollup + health badge + FE render + spec suite → dedicated careful PR. |
| **E10** chunk-resilience | ✅ merged (#704) | — |

## Parallel-QA findings (user, during the loop) — disposition
Fixed: F-TIME-1 (#694), F-LEAVE-PREVIEW (#697), F-JQL-DROPDOWN (#695), F-CASES-SCROLL (#696), F-REDIRECT-DASH (#698), CAPEX (#693), F-POSITION-NO-CTA (#702), SC-7 Create-Case (#705) + keystone (#706), F-REPORTS-CHUNK (#704). Open: **F-HEALTH-EMPTY** (above), **F-CLIENT-NOUI** (✅ B), **F-MILESTONE-UX** (→ EPIC C). Detail: `memory/project-qa-parallel-findings.md`.

## Fresh-session starting points
Each remaining epic is decomposed in `docs/product-discovery/backlogs/*.md` with JTBD + user stories + atomic items. Highest-value next: **D3** (M365 Graph, additive/flag-gated — safe) or **F-HEALTH-EMPTY** (user-reported, but high-blast — do carefully with full portfolio-rollup + health-badge + FE regression coverage). EPIC C → Claude Design.
