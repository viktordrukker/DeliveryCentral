# Planning Pack — Doc Map

**Last refreshed:** 2026-05-23 (post-cleanup pass — 9 superseded docs moved to `docs/archive/2026-05-23/`)

This directory is split into four tiers: **live execution tracking**, **strategic context**, **audit + evidence**, and **active workstreams**. Anything not on this map is either in `../archive/` or stale (see "Subdir staleness register" below).

---

## Tier 1 — Live execution tracking (start here)

| File | Role |
|---|---|
| [`MASTER_TRACKER.md`](./MASTER_TRACKER.md) | **The execution source-of-truth.** Status table of all phases/sprints (F-2..F-11 closed; F-12+ in flight). Per-item check-off, blockers, PR references. |
| [`current-state.md`](./current-state.md) | Platform snapshot — what is implemented vs outstanding, oriented to the bank-IT framing. Refreshed per sprint. |
| [`~/.claude/plans/now-it-is-a-zazzy-gizmo.md`](/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md) | **Bank-IT strategic plan** (locked 2026-05-10). Cat-1/Cat-2/Cat-3 categorization of all open work. Read alongside MASTER_TRACKER. |
| [`synthesis-themes.md`](./synthesis-themes.md) | 24-theme catalog (T-01..T-24) derived from 87 D-items. Drives sprint grooming. |

---

## Tier 2 — Strategic context + hardening companions

| File | Role |
|---|---|
| [`HARDEN_BRIEF.md`](./HARDEN_BRIEF.md) | Hardening initiative brief (HD-* + F-series chunks). Cross-referenced by D-items. |
| [`HARDEN_WIRING_MAP.md`](./HARDEN_WIRING_MAP.md) | Endpoint inventory + design-system specs + risk register. Pair with HARDEN_BRIEF. |
| [`AUDIT_REMEDIATION_TRACKER.md`](./AUDIT_REMEDIATION_TRACKER.md) | Tech-debt sweep tracker (orthogonal scope to MASTER_TRACKER). |
| [`bank-it-deployment-runbook.md`](./bank-it-deployment-runbook.md) | Cat-1 deployment guide. Refresh pending post-F-8 to flip resolved checkboxes. |
| [`UX_OPERATING_SYSTEM_v2.md`](./UX_OPERATING_SYSTEM_v2.md) | Canonical UX OS. Ancestor doc for Phase DS work. |
| [`persona-jtbds.md`](./persona-jtbds.md) | 8-persona JTBD anchor doc. Stable reference. |
| [`workforce-ops-benchmark-synthesis.md`](./workforce-ops-benchmark-synthesis.md) | Benchmark synthesis (referenced by HARDEN_BRIEF). |

---

## Tier 3 — Audit + evidence (load-bearing reference; do not archive)

**Phase 1-9 audit docs** — every D-item in MASTER_TRACKER cites these as "Source: …":

| File | Phase |
|---|---|
| [`flow-audit.md`](./flow-audit.md) | Phase 1 |
| [`functional-duplication-register.md`](./functional-duplication-register.md) | Phase 2 |
| [`data-quality-audit.md`](./data-quality-audit.md) | Phase 3 |
| [`jtbd-validation-matrix.md`](./jtbd-validation-matrix.md) | Phase 4 |
| [`customization-debt-register.md`](./customization-debt-register.md) | Phase 5 |
| [`ui-normalization-audit.md`](./ui-normalization-audit.md) | Phase 6 |
| [`tab-and-nav-audit.md`](./tab-and-nav-audit.md) | Phase 7 |
| [`scalability-modularity-audit.md`](./scalability-modularity-audit.md) | Phase 8 |
| [`real-org-readiness-gap.md`](./real-org-readiness-gap.md) | Phase 9 |
| [`tenant-uniqueness-audit.md`](./tenant-uniqueness-audit.md) | DM-7.5 closure artifact |

**Closed sprint/walk artifacts kept for reference:**

| File | Why kept |
|---|---|
| [`sprint-f2-readiness-2026-05-11.md`](./sprint-f2-readiness-2026-05-11.md) | Bank-IT plan cites UAT scenarios 02-13 from this file |
| [`clickthrough-gap-report-2026-05-10.md`](./clickthrough-gap-report-2026-05-10.md) | Cited from bank-IT plan as the post-F-0/F-1 walk baseline |
| [`research-checkpoints/`](./research-checkpoints/) | 13 phase-N.md files; cited from MASTER_TRACKER as Phase-N evidence sources |
| [`jtbd-screenshots/`](./jtbd-screenshots/) | Raw walker outputs (PNGs + JSON) backing JTBD audit |

**Phase RESEARCH driving docs:**

| File | Role |
|---|---|
| [`CLAUDE_CODE_RESEARCH_PROMPT.md`](./CLAUDE_CODE_RESEARCH_PROMPT.md) | 12-phase research prompt that drove the 2026-05-09/10 audit cohort (Phase RESEARCH closed). Cited from MASTER_TRACKER L88. |
| [`CLAUDE_CODE_TASKS.md`](./CLAUDE_CODE_TASKS.md) | Validation triage for Phase RESEARCH deliverables. Cited from MASTER_TRACKER L2751. |

---

## Tier 4 — Active workstreams (Phase DS + DM)

### Phase DS — Design System Standardization (in progress)

| File | Role |
|---|---|
| [`phase18-page-grammars.md`](./phase18-page-grammars.md) | 8 canonical page grammars |
| [`phase18-refactor-standards.md`](./phase18-refactor-standards.md) | Refactor standards + verification template |
| [`phase18-route-jtbd-audit.md`](./phase18-route-jtbd-audit.md) | Route → JTBD mapping for 60+ routes |
| [`phase18-standardization-changelog.md`](./phase18-standardization-changelog.md) | Per-page log of standardization status |
| [`ds-api-reference.md`](./ds-api-reference.md) | DS primitive API reference |
| [`ds-conformance-ratchet.md`](./ds-conformance-ratchet.md) | Conformance baseline |
| [`ds-dash-compact-table-playbook.md`](./ds-dash-compact-table-playbook.md) | dash-compact-table playbook |
| [`ds-deferred-items.md`](./ds-deferred-items.md) | Cross-phase deferred-items register |
| [`ds-outstandings.md`](./ds-outstandings.md) | DS outstanding items |
| [`ux-contracts/`](./ux-contracts/) | UX contracts for 20 highest-traffic pages |

### Phase DM — Data Model Remediation (partial; DM-2.5 controller rollout blocked)

| File | Role |
|---|---|
| [`aggregate-map.md`](./aggregate-map.md) | Aggregate inventory |
| [`schema-conventions.md`](./schema-conventions.md) | Schema conventions (binding on every schema change) |
| [`dm2-expand-contract-runbook.md`](./dm2-expand-contract-runbook.md) | DM-2 expand/contract runbook |
| [`dm2.5-controller-migration-template.md`](./dm2.5-controller-migration-template.md) | DM-2.5 publicId controller migration template |
| [`data-model-decisions.md`](./data-model-decisions.md) | Data-model decision log |
| [`drift-events.md`](./drift-events.md) | Schema drift events |
| [`enum-evolution-playbook.md`](./enum-evolution-playbook.md) | Enum → dictionary playbook (T-09 D-107) |

### Other active workstreams

| File | Role |
|---|---|
| [`a11y-01-plan.md`](./a11y-01-plan.md) | A11Y-01 planning doc |
| [`canonical-staffing-workflow.md`](./canonical-staffing-workflow.md) | Phase CSW closure doc (9-state assignment workflow) |

---

## Archive

| Cohort | Contents |
|---|---|
| [`../archive/2026-05-23/`](../archive/2026-05-23/) | **Latest** — 9 superseded roadmaps + closed-sprint planning docs. See [README](../archive/2026-05-23/README.md). |
| [`../archive/2026-05-10/`](../archive/2026-05-10/) | First archive pass — 12 phase-17/PvA/MUI/time-consolidation docs. |

---

## Subdir staleness register

Refreshed in the 2026-05-23 reconciliation pass:

| Subdir | Status (2026-05-23) | Notes |
|---|---|---|
| `../api/` | ✅ Refreshed | Endpoint inventory now lists 59 controller prefixes across 37 modules; F-4 integrations + OIDC + LDAP + integrations registry covered |
| `../database/` | ✅ Refreshed | `schema-overview.md` lists 106 models grouped by domain; `indexing-strategy.md` covers D-110 FK indexes + DM-7.5 tenant uniqueness + DM-4-1/D-111 CHECKs |
| `../security/` | ✅ Refreshed | `authentication.md` covers local + 2FA + OIDC + LDAP + M365 directory + impersonation; `rbac.md` covers 7 roles + 4 decorators + D-159 customization + D-167 redact-payload |
| `../infra/` | ✅ Refreshed | HD-11 prom-client + `/metrics` + `/api/health/deep` covered; Windows path removed; outbox round-trip snapshot added |
| `../product/` | ✅ Refreshed | Added Financial Governance + Project Radiator, Staffing Desk + Workforce Planner, Help Center, Pulse, Setup Wizard to bounded-contexts + context-map + domain-glossary + ownership-matrix |
| `../domains/` | 🟨 Index + 3 banners | New `README.md` index + STALE banners on `assignment-lifecycle.md` (pre-CSW), `project-lifecycle.md` (pre-PR-v1), `notifications.md` (pre-outbox-publisher + nudge + SLA pre-breach). Remaining 19 files describe stable concepts; refresh per-file on next material change to the matching `src/modules/<X>/` |

`../engineering/`, `../features/`, `../runbooks/`, `../testing/`, `../ui/`, `../architecture/`, `../deployment/`, `../integrations/`, `../demo/` are current as of last touch.

---

## Conventions

- **Mark archive candidates with a 1-line marker** at the top of the file before `git mv`-ing to `../archive/<YYYY-MM-DD>/`.
- **The archive README** at `../archive/<YYYY-MM-DD>/README.md` is the manifest — explains what + why + replacement.
- **Don't archive load-bearing audit docs**, even if they're 6+ weeks old. Run `grep -rn "<filename>" docs/planning/MASTER_TRACKER.md current-state.md synthesis-themes.md ~/.claude/plans/` before archiving anything.
- **One source-of-truth roadmap** at a time. As of 2026-05-23: `MASTER_TRACKER.md` (execution) + `~/.claude/plans/now-it-is-a-zazzy-gizmo.md` (strategy). Any new "plan" doc that competes for that authority should be merged in or rejected.
