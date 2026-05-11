# Phase 8 Checkpoint — Scalability + Modularity Audit

**Run date:** 2026-05-10
**Status:** complete; awaiting user validation gate before MASTER_TRACKER append.
**Artifact:** [docs/planning/scalability-modularity-audit.md](../scalability-modularity-audit.md) — module dependency graph, top 20 perf hotspots, 6 scaling-cliff projections, modularity refactor table, 11 sub-area sections, tracker cross-reference index.

## Counts

| Metric | Target | Actual |
|---|---|---|
| Sub-areas (a–k) covered | 11 | **11** |
| Ranked perf hotspots | ≥10 | **20** |
| Scaling-cliff projections | ≥3 | **6** |
| New D-items proposed | — | **11** (D-142..D-152) |
| Findings cross-referenced to existing tracker | — | 9 (no re-mint) |
| Modules audited (backend) | per src/modules/ | **34** |
| `findMany` invocations counted | — | 308 across 93 files (9 unbounded, 18 bounded-by-usage, ~281 safe) |
| `forwardRef` modules / cycles | — | **5 modules / 3 bidirectional cycles** (refines Phase 20c-08 from "4 modules") |
| God files (LoC > 400 backend / 500 frontend) | — | 6 named (3 backend, 3 frontend) |

## Findings summary (≤300 words)

**Architecture is clean at the depcruise gate** — `npm run architecture:check` exits 0 against all 5 forbidden boundary rules. The deeper coupling story is fan-out: `dashboard` imports from 10 modules, `project-registry` from 8, `organization` from 6. Acceptable for "presentation aggregation" hubs, but should be explicit policy (D-152).

**Phase 20c-08 count refinement:** 5 modules use `forwardRef` (assignments, organization, project-registry, staffing-requests, exceptions); only **3 are bidirectional cycles** (assignments↔organization, assignments↔project-registry, organization↔project-registry). The other two are unidirectional DI ordering. D-151 captures this.

**Phase 20c-12 scope closure:** 9 unbounded `findMany` calls confirmed (out of 308). Top three are TimesheetEntry-related (D-144) and account for ~2 M row-touches per dashboard load.

**Connection pool is wholly defaulted** — no `connection_limit` set anywhere; default ~9 connections at 4 vCPU. Cliff at ~50 concurrent users (D-143).

**Outbox publisher is skeleton-only** — model exists, `DomainEventService` exists, but **zero producers** + **zero publisher** + missing schema columns (`attemptCount`, `lastError`). HARDEN_BRIEF F2 already plans the work; D-142 is the scale-lens cross-ref.

**Highest-ROI scaling work** (cross-cutting): materialized views for utilization, planned-vs-actual, capitalisation, overtime (D-147). D-110 (FK indexes) is the prerequisite.

**Memory hot paths are fine** — every in-process cache is bounded by `SimpleCache` global LRU (1,000 entries) with explicit TTLs. No OOM cliff identified.

**CDN posture is one-size-fits-all `no-store`.** Quick wins: tenant-shared metadata to `public, max-age=3600` (D-148), ETag for heatmaps + radiator (D-149).

**God-file refactors:** `setup.service.ts` (696), `MyTimePage.tsx` (1,237), `TimesheetPage.tsx` (971) are accumulation-style; `workforce-planner.service.ts` (1,584) is cohesive but warrants split (D-150). Phase 20c-15 already covers dashboard pages.

## Skills invoked

- `software-architecture` — for the module-coupling rubric and forbidden-import gate framing.
- `tech-debt-tracker` — to keep findings ranked by remediation cost × blast radius.
- `performance-engineer` + `database-architect` — for the n+1, materialized-view, and connection-pool reasoning.
- `code-review-excellence` — for the god-file "by-domain vs by-accumulation" verdict.
- The spec's `engineering:*` plugins are not installed; the local skills covered the methodology. Subagent dispatch was via the host built-in `Explore` agent (4 parallel subagents).

## Tracker append plan (on user approval)

A new sub-heading `### Phase 8 — Scalability and modularity (docs/planning/scalability-modularity-audit.md)` will be appended to `## Research Findings (D-85+)`. Counter advances D-141 → D-152.

| New D-id | Verdict | Title | Rationale (1 sentence) | Source |
|---|---|---|---|---|
| **D-142** | [SCALE] | Outbox publisher + DomainEvent producers — zero-wired | Schema models + service skeleton exist, but a recursive grep finds zero producers and zero publisher; missing `attemptCount`/`lastError` on `OutboxEvent`. Cross-ref HARDEN_BRIEF F2. | audit §3(g) |
| **D-143** | [SCALE] | Database connection-pool defaults unconfigured | `prisma.service.ts:50-58` instantiates `PrismaClient` with no `connection_limit`; default ~9 at 4 vCPU; cliff at ~50 concurrent users. | audit §3(j) |
| **D-144** | [SCALE] | Top-3 unbounded findMany (closes Phase 20c-12 scope) | `project-assignment.repository.ts:84` empty where; `planned-vs-actual-query.service.ts:79` no take; DM dashboard 4× full TimesheetEntry scans (`delivery-manager-dashboard-query.service.ts:211/242/284/353`). | audit §3(c) |
| **D-145** | [N+1] | PvA per-project `findUnique` loop | `planned-vs-actual-query.service.ts:382-384` — replace with `findMany({ where: { id: { in: pids } } })`. | audit §3(b) |
| **D-146** | [N+1] | Workforce planner per-person `platformSetting.findUnique` | `workforce-planner.service.ts:625` — hoist outside the 5,000-person loop. | audit §3(b) |
| **D-147** | [PERF] | Materialized rollup table bundle | `mv_person_week_utilization`, `mv_project_week_actuals`, `mv_project_capitalisation_month`, `mv_overtime_summary_week`, `mv_dm_dashboard_aggregates`, `mv_radiator_history`; D-110 (FK indexes) is prerequisite. | audit §3(h) |
| **D-148** | [PERF] | CDN-able tenant-shared metadata | Override global `no-store` (`main.ts:55`) on `/api/admin/skills`, `/api/metadata/dictionaries*`, `/api/admin/roles`, `/api/admin/grades` to `public, max-age=3600`. | audit §3(i) |
| **D-149** | [PERF] | ETag + 304 for heatmaps + radiator | No ETag support in src/; add ETag interceptor for `/api/reports/mood-heatmap`, `/api/staffing-desk/project-timeline`; switch radiator endpoints to `private, max-age=60`. | audit §3(i) |
| **D-150** | [REFACTOR] | God services + non-dashboard god FE pages | Backend `setup.service.ts` (696 LoC, accumulation); FE `MyTimePage.tsx` (1,237) + `TimesheetPage.tsx` (971); plus `workforce-planner.service.ts` (1,584, cohesive but split-worthy). Distinct from Phase 20c-15 (dashboard pages). | audit §3(e) |
| **D-151** | [DOC] | Refine forwardRef cycle count (Phase 20c-08) | Actual is **5 modules participating, 3 bidirectional cycles** (not "4 modules"); `staffing-requests`/`exceptions` are unidirectional DI. | audit §3(d) |
| **D-152** | [DECIDE] | Dashboard module hub coupling (10 imports) | Decide explicitly: keep `dashboard.module.ts` as a "presentation aggregation" hub (today's reality) OR push queries back to owning modules behind a thin facade. Same shape applies to `exceptions.module.ts` (6 imports). | audit §3(a) |

(11 items; counter ends at D-152.)

## Open questions / next-session inputs

- **D-142 vs HARDEN_BRIEF F2** — strictly speaking F2.1–F2.4 already plan this work. D-142 is a thin "scale lens" cross-ref so a future reader who finds it via a hot-path scan reaches F2 quickly. If the reviewer prefers, fold D-142's body into a comment under F2.4 instead of minting a new ID.
- **D-143's `connection_limit` value** is environment-specific. The actionable shape is "make it env-driven and document the tuning matrix" — the actual value belongs in the deploy runbook, not the code.
- **D-147 (MV bundle)** depends on D-110 landing first. Should not be scheduled before D-110.
- **D-150 frontend pieces** overlap conceptually with Phase 18 (page grammars). Confirm whether to schedule under Phase 18 follow-up or as standalone refactors.
- **D-152's decision** has architectural reach (changes `dashboard` from "import everything" to "facade-based"). Worth a short ADR before scheduling.
- **Phase 9 input** — real-organization readiness gap. The data-quality + scaling cliffs from this phase + Phase 3 give Phase 9 most of its evidence base; the missing piece is org-policy / RBAC reality (what a real Director / RM expects to see at 5,000-person scale that the seed data doesn't exercise).

## Exit conditions hit

- ✅ All 11 sub-areas (a–k) covered with evidence
- ✅ Module dependency graph (mermaid + import-count table)
- ✅ ≥10 ranked perf hotspots (20 in audit §2)
- ✅ ≥3 scaling-cliff projections (6 in audit §4)
- ✅ Modularity refactor recommendations table
- ✅ File:line citations throughout
- ✅ Cross-reference table to existing tracker items (audit §6)
- ✅ depcruise architecture rules verified green

**Stop here.** Awaiting validation gate before tracker append.
