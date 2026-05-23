# Archive 2026-05-23 — Doc cleanup pass

This cohort archives 9 documents that were superseded by Sprints F-2..F-11 closing the bank-IT Cat-1 stack (per `docs/planning/MASTER_TRACKER.md` status table) and by the bank-IT pivot decision of 2026-05-10 locking the Cat-1/Cat-2/Cat-3 framing (plan at `~/.claude/plans/now-it-is-a-zazzy-gizmo.md`).

Files are kept here for decision trail + traceability. None are referenced from any live planning doc as of 2026-05-23 (verified by grep against `MASTER_TRACKER.md`, `current-state.md`, `synthesis-themes.md`, `~/.claude/plans/now-it-is-a-zazzy-gizmo.md`, root `CLAUDE.md`).

## Manifest

| File | Original mtime | Reason archived | Replacement / current SoT |
|---|---|---|---|
| `NEXT_ITERATION_PLAN.md` | 2026-05-11 | Phase 11 research deliverable. Was labelled "master plan" but bank-IT pivot (2026-05-10) reshaped execution into Cat-1/Cat-2/Cat-3 sprints F-2..F-11. The plan's 9 Goals (T-01..T-09) survive as the theme catalog in `synthesis-themes.md`. | `MASTER_TRACKER.md` + bank-IT pivot plan |
| `ULTIMATE_ANALYSIS_AND_PLAN.md` | 2026-05-11 | Pre-pivot strategic synthesis (2026-05-09). Frames product as multi-tenant SaaS; pivot locked single-tenant per-bank install. F6 multi-tenant scaffolding stays in code behind a flag. | Bank-IT pivot plan |
| `master-plan.md` | 2026-04-30 | PM-authored v0.1; marked "All phases complete 2026-04-08" — stale by 7+ sprints (F-2..F-11). Governance principles already absorbed by `CLAUDE.md` and the Phase DS deferred-items register. | `MASTER_TRACKER.md` |
| `sprint-f3-lean-ops.md` | 2026-05-12 | Sprint F-3 closed (PRs #32–#39 per MASTER_TRACKER L91). Planning doc, not a closure artifact. | Status row in `MASTER_TRACKER.md` |
| `sprint-f4-integrations.md` | 2026-05-13 | Sprint F-4 closed (PRs #40–#47 per MASTER_TRACKER L92). | Status row in `MASTER_TRACKER.md` |
| `f-6-ratchet-checkin-2026-05-15.md` | 2026-05-15 | Post-sprint architectural ratchet snapshot. F-6 closed; future ratchet check-ins live inline in the tracker (no need for a per-sprint file). | `MASTER_TRACKER.md` L94 |
| `f-7-ratchet-checkin-2026-05-15.md` | 2026-05-15 | Same as above for F-7. | `MASTER_TRACKER.md` L95 |
| `dm-5-1-raw-sql-audit-2026-05-17.md` | 2026-05-17 | One-time audit; concluded "no code change required." Closure noted at `MASTER_TRACKER.md` L2569. | inline in tracker |
| `_inventory-2026-05-10.md` | 2026-05-11 | Inventory pass that drove the 2026-05-10 archive cohort; its job is done. The 2026-05-10 archive is at `../2026-05-10/`. | this archive |

## What was NOT archived (and why)

Several documents that look stale at a glance are actually load-bearing:

- **9 Phase 1-9 audit docs** (`flow-audit.md`, `functional-duplication-register.md`, `data-quality-audit.md`, `jtbd-validation-matrix.md`, `customization-debt-register.md`, `ui-normalization-audit.md`, `tab-and-nav-audit.md`, `scalability-modularity-audit.md`, `real-org-readiness-gap.md`) — every D-item in `MASTER_TRACKER.md` cites these as "Source: …". Cannot be archived without breaking the evidence chain.
- **`research-checkpoints/phase-*.md`** (13 files) — cited from `MASTER_TRACKER.md` L2815-2995 as Phase-N evidence sources for D-85..D-171.
- **`CLAUDE_CODE_RESEARCH_PROMPT.md` + `CLAUDE_CODE_TASKS.md`** — referenced from `MASTER_TRACKER.md` L88 ("Driving prompt") and L2751 ("Validation Triage").
- **`HARDEN_BRIEF.md` + `HARDEN_WIRING_MAP.md`** — actively used by D-items as cross-references.
- **`AUDIT_REMEDIATION_TRACKER.md`** — orthogonal tech-debt tracker; complements `MASTER_TRACKER.md`.
- **`sprint-f2-readiness-2026-05-11.md`** — bank-IT pivot plan L130 cites UAT scenarios 02-13 from this file.
- **`clickthrough-gap-report-2026-05-10.md`** — referenced from bank-IT pivot plan L838.

## Subdir refresh deferred (not archived)

`docs/database/`, `docs/security/`, `docs/product/`, `docs/domains/`, `docs/infra/` are flagged stale (pre-Phase HD/CSW/F-series shape) but were not refreshed in this pass because refresh requires code/doc reconciliation effort. Tracked in `docs/planning/README.md` "Subdir staleness register."
