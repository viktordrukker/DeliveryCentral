# Phase 7 Checkpoint — Tab and Nav Audit

**Run date:** 2026-05-10
**Status:** complete; awaiting user validation gate before MASTER_TRACKER append.
**Artifact:** [docs/planning/tab-and-nav-audit.md](../tab-and-nav-audit.md) — current category tree + verdict per group + proposed restructure + 6 new D-items.

## Counts

| Metric | Target | Actual |
|---|---|---|
| Routes audited | per route-manifest | **60+** (full manifest) |
| Groups assessed | 6 | 6 (`dashboard`, `people-org`, `work`, `governance`, `evidence`, `admin`) |
| Underused / empty groups flagged | — | 2 (`governance`, `evidence`) |
| Overloaded groups flagged | — | 2 (`work` 18 routes, `admin` 15 routes) |
| Proposed groups | — | 9 (or 8 if dashboard isn't split) |
| New D-items | — | 6 (D-136..D-141) |

## Findings summary (≤300 words)

**Two healthy groups** — `dashboard` (9 entries) and `people-org` (5 entries) are well-shaped.

**Two overloaded groups:**
- `work` carries 18 routes spanning 5 distinct concerns (project lifecycle, time/leave, reports, cases, staffing). PMs and finance users find unrelated entries in the same label.
- `admin` carries 15 routes mixing setup, integrations, audit, and access management. Closes the "no admin landing" finding from Phase 4 (D-117) — admin *is* the surface, and it's flat.

**Two underused groups:**
- `governance` has only 2 entries (Exceptions + Integrations). Integrations is a duplicate of `/admin/integrations` per D-101. Approval-flavoured "Governance" is phantom — it'll become real only when D-91 (case approve), D-92 (budget approve), D-93 (period lock) land.
- `evidence` has 1 entry (`/work-evidence`). A category for one route is a folder, not a category. Folds cleanly into reports.

**Implicit "My Work" pseudo-group** — computed at sidebar render time from `(employee dashboard + account settings)` per-user role-aware. Not stored as a `RouteGroup`. Engineers reading `route-manifest.ts` won't see it — discoverability gap (D-141).

**Cross-referenced Phase 2 / Phase 4** for nav-related findings:
- Cmd+K palette + sidebar + breadcrumb share a single source of truth (Phase 2 register §6 refuted candidate)
- Per-role default landing has known issues (D-119 dual-role precedence, D-120 RM data thinness)
- Silent JS RBAC errors per D-121

**Proposed restructure**: split `work` → `projects/staffing/time/reports`; retire `governance/evidence` (fold into `reports`); split `admin` → `admin-config/admin-integrations/admin-governance`. Net: 6 → 9 groups, 4-9 entries each. Pure rename + re-tag; no behavior change.

## Skills invoked

- `product-management-toolkit` (process-doc shape) and `tech-debt-tracker` — methodology inlined: count routes per group, flag overloaded (>10) and underused (<3), propose splits that align with persona JTBDs not engineering folders.
- `code-review-excellence` — for the per-group rationale (each split has a domain rationale; no split for split's sake).
- The spec's `product-management:synthesize-research` and `operations:process-doc` plugins are not installed; the local skills covered the methodology.

## Tracker append plan (on user approval)

A new sub-heading `### Phase 7 — Tab and nav (docs/planning/tab-and-nav-audit.md)` will be appended to `## Research Findings (D-85+)`.

| New D-id | Description |
|---|---|
| D-136 | [REORG] Split `work` (18 → 4 groups: `projects`, `staffing`, `time`, `reports`) |
| D-137 | [REORG] Retire `governance` (fold `/exceptions` to `reports`; resolve `/integrations` duplicate per D-101) |
| D-138 | [REORG] Retire `evidence` (fold `/work-evidence` to `reports`; companion to D-116 RBAC fix) |
| D-139 | [REORG] Split `admin` (15 → 3 groups: `admin-config`, `admin-integrations`, `admin-governance`); closes D-117 |
| D-140 | [TYPE] Update `RouteGroup` type to 8-9 keys reflecting D-136..D-139 |
| D-141 | [DOC] Codify or comment the implicit "My Work" pseudo-group at `SidebarNav.tsx:82-87` |

(6 items; counter ends at D-141.)

## Open questions / next-session inputs

- **D-136..D-140 should ship together** as a single migration — partial reorganization is worse than the current state. Sprint planning should treat them as a single PR with rollout messaging (muscle-memory cost for users).
- **D-137's resolution depends on D-101** — clarify the `/integrations` vs `/admin/integrations` story before retiring the governance group.
- **The "My Work" pseudo-group decision (D-141)** is the one-and-done call: codify (richer model, future home for "My Cases / My Time / My Approvals") or comment (cheap; documents the sidebar render quirk).
- **Phase 8 input:** scalability + modularity audit — substantially overlaps with `dependency-cruiser` config + Phase 20c-01 / 20c-08 / 20c-12 / 20c-15 in the existing tracker. Plan a thin Phase 8 leveraging existing module-boundary work.

## Exit conditions hit

- ✅ Current category tree
- ✅ Proposed category tree with rationale
- ✅ Per-role visibility table (delegated to Phase 4 walker; no re-validation)
- ✅ Cmd+K palette tier organization assessed
- ✅ Cross-references to Phase 2, Phase 4, D-91/92/93/101/116/117/119/120/121

**Stop here.** Awaiting validation gate before tracker append.
