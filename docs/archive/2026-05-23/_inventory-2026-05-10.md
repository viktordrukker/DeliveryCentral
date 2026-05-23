# Inventory of `docs/planning/` — 2026-05-10

**Purpose:** doc-revision side-job 1.1 of the bank-IT pivot plan (`/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md`). Manifests every file in `docs/planning/` with mtime + primary phase reference + disposition. Drives the archive pass (1.2).

**Counts:** 55 files in `docs/planning/`. Disposition split: **41 keep**, **12 archive**, **2 reference-only / superseded but kept** (CLAUDE_CODE_RESEARCH_PROMPT.md + CLAUDE_CODE_TASKS.md).

## A — Active / canonical (keep)

These are the live planning docs. Anchor for current and future work.

| File | Mtime | Phase / family | Why keep |
|---|---|---|---|
| MASTER_TRACKER.md | 2026-05-10 | tracker | Single source of truth for outstanding work |
| current-state.md | 2026-05-10 | tracker companion | Implemented vs outstanding (will be regenerated 1.3) |
| README.md | 2026-04-04 | index | Canonical doc index |
| NEXT_ITERATION_PLAN.md | 2026-05-10 | Phase 11 | Master plan for the iteration |
| next-iteration-roadmap.xlsx | 2026-05-10 | Phase 11 | 5-sheet roadmap |
| synthesis-themes.md | 2026-05-10 | Phase 10 | 24-theme catalog with Mermaid DAG |
| AUDIT_REMEDIATION_TRACKER.md | 2026-04-30 | audit | Zero tech debt sweep tracker (active) |
| master-plan.md | 2026-04-30 | strategic | DeliveryCentral master plan, owner = PM |

## B — Phase 1–9 audit outputs (keep — produced 2026-05-09/10)

| File | Mtime | Phase |
|---|---|---|
| flow-audit.md | 2026-05-09 | Phase 1 |
| functional-duplication-register.md | 2026-05-09 | Phase 2 |
| data-quality-audit.md | 2026-05-09 | Phase 3 |
| jtbd-validation-matrix.md | 2026-05-09 | Phase 4 |
| customization-debt-register.md | 2026-05-10 | Phase 5 |
| ui-normalization-audit.md | 2026-05-10 | Phase 6 |
| tab-and-nav-audit.md | 2026-05-10 | Phase 7 |
| scalability-modularity-audit.md | 2026-05-10 | Phase 8 |
| real-org-readiness-gap.md | 2026-05-10 | Phase 9 |

## C — In-flight initiatives (keep)

These are still referenced by open tracker items.

| File | Mtime | Family | Open tracker references |
|---|---|---|---|
| HARDEN_BRIEF.md | 2026-05-02 | HARDEN | F1-F9, HD-* still in flight |
| HARDEN_WIRING_MAP.md | 2026-05-02 | HARDEN | endpoint inventory + meta-audit |
| aggregate-map.md | 2026-04-18 | DM | DM-2/3 schema |
| schema-conventions.md | 2026-04-18 | DM | DM conventions |
| dm2-expand-contract-runbook.md | 2026-04-18 | DM-2 | DM-2-ops-expand still open |
| dm2.5-controller-migration-template.md | 2026-04-18 | DM-2.5 | DM-2.5-8..12 still open |
| enum-evolution-playbook.md | 2026-04-18 | DM | T-09 D-107 references this |
| drift-events.md | 2026-04-18 | DM | drift detection |
| tenant-uniqueness-audit.md | 2026-04-23 | DM-7.5 | DM-7.5 multi-tenant work |
| data-model-decisions.md | 2026-04-26 | DM | architectural decisions |
| canonical-staffing-workflow.md | 2026-04-18 | flows | T-16 D-90 references this |
| a11y-01-plan.md | 2026-04-27 | a11y | A11Y-01 still pending |
| ds-deferred-items.md | 2026-04-30 | DS | DS-5 decision (T-22 D-134) |
| ds-conformance-ratchet.md | 2026-04-30 | DS | conformance baseline |
| ds-api-reference.md | 2026-04-30 | DS | DS API reference |
| ds-dash-compact-table-playbook.md | 2026-04-30 | DS | dash-compact-table playbook |
| ds-outstandings.md | 2026-04-30 | DS | DS outstanding items |
| phase18-page-grammars.md | 2026-04-14 | Phase 18 | 8 page grammars |
| phase18-refactor-standards.md | 2026-04-30 | Phase 18 | refactor standards |
| phase18-standardization-changelog.md | 2026-04-14 | Phase 18 | per-page log (in flight) |
| phase18-route-jtbd-audit.md | 2026-04-16 | Phase 18 | route → JTBD mapping |

## D — Reference / one-off but still useful (keep)

| File | Mtime | Why keep |
|---|---|---|
| persona-jtbds.md | 2026-04-04 | 8-persona JTBD anchor doc |
| UX_OPERATING_SYSTEM_v2.md | 2026-04-12 | UX OS v2 canonical |
| workforce-ops-benchmark-synthesis.md | 2026-05-02 | benchmark synthesis (referenced by HARDEN_BRIEF) |
| CLAUDE_CODE_RESEARCH_PROMPT.md | 2026-05-10 | 12-phase research spec (closed; kept for traceability) |
| CLAUDE_CODE_TASKS.md | 2026-05-03 | active validation triage + PR checklist reference |

## E — Archive (12 files → `docs/archive/2026-05-10/`)

These are closed/superseded. Move via `git mv` to preserve history; each gets a 1-line marker at top.

| File | Mtime | Reason for archive | Replacement |
|---|---|---|---|
| epic-e-f-handover.md | 2026-04-14 | Phase 17 closed (MASTER_TRACKER L68 ✅ Complete 2026-04-14) | NEXT_ITERATION_PLAN.md |
| phase17-runtime-standardization-plan.md | 2026-04-14 | Phase 17 closed | NEXT_ITERATION_PLAN.md |
| planned-vs-actual-dashboard-discovery.md | 2026-04-14 | PvA dashboard rework shipped (14a-D, 15c-H, QA-K3) | (no replacement; one-time discovery) |
| pva-dashboard-rework-plan.md | 2026-04-15 | PvA dashboard rework shipped | (no replacement) |
| page-standardization-prompt-pack.md | 2026-04-14 | Phase 18 prompt pack (one-time tool) | phase18-page-grammars.md |
| ds-1-7-codemod-residuals.md | 2026-04-30 | DS-1-7 codemod ran successfully (387 transforms, 145 files); residuals were swept | ds-outstandings.md |
| ds-mui-audit.md | 2026-04-30 | DS-7-5 MUI audit closed (MASTER_TRACKER L183 ✅) | (no replacement) |
| overtime-mechanics-plan.md | 2026-04-16 | Overtime shipped (DM-4-1 CHECK constraints + Phase HD overtime work) | (no replacement) |
| time-service-consolidation-plan.md | 2026-04-16 | Time service consolidation shipped | (no replacement) |
| time-consolidation-tracker.md | 2026-04-16 | Time service consolidation shipped | (no replacement) |
| v1.3-deploy-followups.md | 2026-04-26 | v1.3 deploy followups absorbed into ops procedures + DM-R fixes | docs/runbooks/ |
| CLAUDE_CODE_TASK_BACKLOG.md | 2026-04-12 | Superseded by NEXT_ITERATION_PLAN.md (0 open items) | NEXT_ITERATION_PLAN.md |

## F — Sub-directories under `docs/` — scan summary

| Subdir | File count | Latest touch | Disposition |
|---|---|---|---|
| docs/api/ | 1 | 2026-04-11 | Active reference (`README.md`); stale-tier — schedule refresh after Cat-1.2 (integration framework changes contract) |
| docs/architecture/ | 7 | 2026-05-10 | Active. Two new docs in this iteration: `audit-vs-activity.md`, `staffing-endpoints-audit.md`. ADR template + decision log live. |
| docs/archive/ | 13 (1 README + 12 archived) | 2026-05-10 | Created 2026-05-10 by Side-job 1.2 |
| docs/database/ | 2 | 2026-03-29 | **Stale** — 6 weeks old. `indexing-strategy.md`, `schema-overview.md` predate DM-3/DM-4 + 12 missing FK indexes (D-110). Refresh after Cat-1.6 D-110 lands. |
| docs/demo/ | 5 | 2026-04-07 | Phase DD/MS demo scenarios (admin/director/HR/PM/RM); reference-only, not blocking |
| docs/deployment/ | 3 | 2026-04-30 | Active (`localhost-docker.md`, `production-readiness.md`, `preprod-hetzner.md`). Bank-IT runbook supersedes for production deployments. |
| docs/domains/ | 8 | 2026-04-04 | **Stale** — predates Phase HD/PR-v1/CSW. Notification, organization, project-closure, project-lifecycle, project-registry, team-dashboard, team-management, work-evidence-ingestion. Schedule refresh after Cat-1 work surfaces solid. |
| docs/engineering/ | 3 | 2026-03-29 | **Old but canonical** — architecture-enforcement.md, contribution-rules.md, testing-policy.md. Verify still accurate. |
| docs/features/ | 3 | 2026-04-18 | Active — Phase PR-v1 deliverables (radiator, EVM, Gantt). |
| docs/infra/ | 2 | 2026-04-04 | **Stale** — observability-integration.md predates HD-11 prom-client. Refresh recommended. |
| docs/integrations/ | 5 | 2026-04-11 | Active. M365, Outlook, Radius, Jira, Teams. **Cat-1.2 will require new entries** for LDAP / JSM (DC + Cloud) / IntegrationAdapter framework / OpenAI-compatible LLM client. |
| docs/product/ | 4 | 2026-03-29 | **Stale** — bounded-contexts, context-map, domain-glossary, ownership-matrix. Schedule refresh after Cat-1 lands. |
| docs/runbooks/ | 7 | 2026-04-23 | Active. PITR restore, panic, chaos drills, partition cutover, soft-delete cutover, role-separation cutover, read-replica. Bank-IT runbook complements. |
| docs/security/ | 2 | 2026-04-04 | **Stale** — authentication.md, rbac.md predate Phase 20a + Phase CC + DM-2.5 publicId security boundary. Refresh required for Cat-1.4/1.9 work. |
| docs/testing/ | 8 | 2026-04-30 | Active. Includes `EXHAUSTIVE_JTBD_LIST.md`, `slo-budgets.json`, `jtbd-matrix.json`, `qa-handoff-2026-04-18.md`. |
| docs/ui/ | 2 | 2026-04-11 | Active reference (`DESIGN_SYSTEM_UX_QA_PACKAGE.md`, `README.md`). Phase DS work supersedes for active design-system status. |

### Subdirs flagged for refresh after Cat-1 lands (not blocking the bank-IT pivot)

- `docs/database/` — DM-3/DM-4 + D-110 FK indexes + D-111 CHECK constraints
- `docs/domains/` — Phase HD/PR-v1/CSW closure + bank-IT framing
- `docs/infra/` — HD-11 prom-client integration
- `docs/security/` — DM-2.5 publicId security + Phase 20a hardening + Cat-1.9 RBAC
- `docs/product/` — bank-IT bounded-context refresh

These are tracked as TODOs but not part of the bank-IT pivot's critical path. Refresh after Cat-1 work lands so docs reflect the new shape.

### Subdirs that are clean (no action)

`docs/api/`, `docs/architecture/`, `docs/archive/`, `docs/demo/`, `docs/deployment/`, `docs/engineering/`, `docs/features/`, `docs/integrations/`, `docs/runbooks/`, `docs/testing/`, `docs/ui/`

## G — Acceptance summary

- [x] All 55 files in `docs/planning/` (top-level) classified
- [x] Archive list of 12 files identified with reason + replacement
- [ ] Side-job 1.2 (archive pass) — runs next
- [ ] Side-job 1.3..1.7 — sequenced after archive pass
