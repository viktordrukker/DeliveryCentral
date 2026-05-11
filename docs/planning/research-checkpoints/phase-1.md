# Phase 1 Checkpoint — Flow Audit

**Run date:** 2026-05-09
**Status:** complete; awaiting user validation gate before MASTER_TRACKER append.
**Artifact:** [docs/planning/flow-audit.md](../flow-audit.md) — 15 flows mapped + 8 multi-path situations classified.

## Counts

| Metric | Target | Actual |
|---|---|---|
| Flows mapped | ≥15 | **15** (Flows 1-15a/b — staffing, project lifecycle, people lifecycle, time, governance) |
| Mermaid sequence diagrams | 1 per flow | 15 |
| Duplicates classified KEEP/DEPRECATE/MERGE | ≥5 | **6 real verdicts** (rows #1-#6) + 2 documented non-duplicates (rows #7-#8) |
| File:line citations | every claim | yes — controllers, services, FE pages cited throughout |

## Findings summary (≤300 words)

**Real duplicates with verdicts:**

1. **Place a person on a project** — MERGE behind one CTA. Six raw FE entry points (`/staffing-requests/new`, `/assignments/new`, `/assignments/bulk`, `/projects/:id` Team tab, `/staffing-desk` planner-apply, `/staffing-board` drag) reach a `ProjectAssignment` row, but the slate-flow path carries governance information (candidates considered + matchScores + rejection reasons) that the direct paths lose. Recommendation: collapse to two user-visible flows ("Quick Add" / "Plan & Propose") with allocation% / strategic-tag routing in the CTA.
2. **`/admin/people/new` vs `/people/new`** — DEPRECATE the admin route. Both render the same component with the same role gate; pure cleanup.
3. **`/timesheets` vs `/my-time`** — DEPRECATE legacy.
4. **`/timesheets/approval` vs `/time-management`** — DEPRECATE legacy.
5. **Legacy assignment endpoints (D-04)** vs canonical 9-status — DEPRECATE legacy entirely; this is Phase WO-6 (already in tracker, pending).
6. **Slate reject-all vs assignment reject** — KEEP both (different artifacts, different downstream effects; document the semantic in canonical-staffing-workflow.md).

**Three incomplete flows surfaced (not duplicates):**

- **Flow 14 — Approve case**: `ApproveCaseService` exists but no controller endpoint and no FE button. Orphaned service.
- **Flow 15a — Approve budget change**: backend `POST /projects/{id}/budget-change-requests/{approvalId}/approve` exists; no FE approval UI.
- **Flow 15b — Period lock**: admin endpoint exists; no FE page anywhere.

These feed Phase 9 (real-organization readiness) more naturally than Phase 1, but were caught here.

**Refuted from prior D-items:** D-72 (planner read-only) confirmed — `/staffing-board` drag today only writes through `GET /workload/check-conflict`; no inline assignment creation despite the "drag" UX implying it.

## Skills invoked

- `kaizen` + `closed-loop-delivery` (process redesign methodology) — inlined: "do paths produce same outcome / does either carry information the other doesn't / does the user know which to pick" rule applied to every multi-path flow.
- `software-architecture` — only conceptually (the merge proposal in row #1 implies a new CTA architecture; no new code proposed).
- `documentation-templates` (SOP/RACI shape) — implied in the FE→API→SVC→DB layout used per flow.
- Spec-named local skills not invoked because the methodology was sufficient inlined.

## Tracker append plan (on user approval)

A new section `## Research Findings (D-85+)` will be appended to the bottom of `MASTER_TRACKER.md`. Phase 1 contributes 8 D-items:

| New D-id | Description | Source |
|---|---|---|
| D-85 | [MERGE] Place a person on a project — collapse 6 FE entry points to 2 user-visible flows; route by allocation% + strategic tag | flow-audit.md row #1 |
| D-86 | [DEPRECATE] `/admin/people/new` (alias of `/people/new`); add client-side redirect | flow-audit.md row #2 |
| D-87 | [DEPRECATE] `/timesheets` (alias of `/my-time`); replace with `<Navigate>` redirect | flow-audit.md row #3 |
| D-88 | [DEPRECATE] `/timesheets/approval` (alias of `/time-management`); replace with `<Navigate>` redirect | flow-audit.md row #4 |
| D-89 | [DEPRECATE] Legacy assignment endpoints (`/approve, /reject, /end, /revoke, /activate`) — covered by Phase WO-6 already; add `Deprecation` headers as transitional measure | flow-audit.md row #5; D-04 reference |
| D-90 | [DOCUMENT] Slate reject-all vs assignment reject — semantic difference recorded in canonical-staffing-workflow.md | flow-audit.md row #6 |
| D-91 | [INCOMPLETE] Approve case — wire `POST /cases/:id/approve` controller endpoint + FE button on CaseDetailPage; service `ApproveCaseService` orphaned | flow-audit.md Flow 14 |
| D-92 | [INCOMPLETE] Approve budget change — wire FE on BudgetTab for `POST /projects/{id}/budget-change-requests/{approvalId}/approve` (backend exists) | flow-audit.md Flow 15a |
| D-93 | [INCOMPLETE] Lock a period — admin FE page missing for `POST /admin/period-locks` | flow-audit.md Flow 15b |

(9 items; counter ends at D-93.)

## Open questions / next-session inputs

- Phase 2 builds on Phase 1's dups: should the "in-memory-staffing-request" naming (D-24) be added to the Phase 2 functional duplication register, or is Phase 20c-03 (rename) sufficient already? — propose: add it as a cross-reference, don't re-classify.
- Flow 1's "merge" verdict implies a new CTA spec; is that PM-toolkit territory (Phase 11), or should we add a Phase-1 follow-up D-item with PRD scope? — propose: leave at the high-level recommendation; Phase 11 picks it up.

## Exit conditions hit

- ✅ ≥15 flows mapped
- ✅ Mermaid per flow
- ✅ ≥5 duplicates classified
- ✅ Source citations (file + line)
- ✅ Phase-0 acceptance still good (no re-reads needed)

**Stop here.** Awaiting validation gate before tracker append + Phase 2.
