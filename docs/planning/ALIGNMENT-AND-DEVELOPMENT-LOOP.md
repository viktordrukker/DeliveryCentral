# DeliveryCentral — Alignment & Development-Loop Charter

**Status:** Living document — the single entry point for "what is the plan, what is done, what is next, and what protects us."
**Created:** 2026-06-16
**Owns:** the reconciliation between the historical `MASTER_TRACKER.md` and the live `docs/product-discovery/EPIC-ROADMAP.md` + `BUILD-STATUS.md`, the guardrail ledger, and the repeating development loop.
**Read this first** at session start (before MASTER_TRACKER), then the doc it routes you to.

---

## 0. Why this document exists

DeliveryCentral now has **two parallel planning systems** that did not cross-reference each other, which made "are we aligned?" unanswerable:

1. **`docs/planning/MASTER_TRACKER.md`** — the original 74-phase backlog (Phases 1–21, A–G, DM, DS, V2, BANK-IT, …). Last meaningfully updated **2026-06-10 (SoT PR 18)**. It is **frozen ~2 weeks behind HEAD**: it contains **zero** references to the A–H epics, to `BUILD-STATUS.md`, or to the ~170-PR stream merged since (#548–#719+).
2. **`docs/product-discovery/EPIC-ROADMAP.md` + `BUILD-STATUS.md`** — the **live** "next-phase epic" plan (landed #699/#707, 2026-06-13). This is what currently drives day-to-day work via a depth-first, flag-gated, deploy-to-v2 loop.

This charter declares the source-of-truth hierarchy, reconciles the two, and defines the loop so the project has **one** answer to "what's next."

---

## 1. Source-of-truth hierarchy (canonical)

| Question | Authoritative source |
|---|---|
| What is the **current** work / next epic to build? | `docs/product-discovery/BUILD-STATUS.md` (live epic-build loop) |
| What is the **epic plan** (A–H) + priority/sequence/rationale? | `docs/product-discovery/EPIC-ROADMAP.md` |
| Per-epic decomposition (JTBD, user stories, atomic items) | `docs/product-discovery/backlogs/EPIC-*.md` + `E1–E7-*.md` |
| Historical phase backlog + what's already shipped | `docs/planning/MASTER_TRACKER.md` (mostly complete; **several stale-active rows — see §5**) |
| The V2/lean go-live critical path | `~/.claude/plans/v2-source-of-truth-2026-06-09.md` (MASTER_TRACKER Phase V2 explicitly defers to it) |
| What protects us (lessons → guardrails) | **§6 of this doc** + `CLAUDE.md` §8 pitfalls + `.claude/rules/ux-laws.md` |
| Full surface inventory + QA verdicts | `docs/qa/action-inventory.json` (branch `qa/v2-full-surface-2026-06-13`) + the autonomous-QA prompt `~/.claude/plans/autonomous-qa-analytics-prompt-2026-06-13.md` |

**Rule:** new feature/integration work is tracked in **BUILD-STATUS.md**, not MASTER_TRACKER. MASTER_TRACKER is closed to new epics; it is maintained only to (a) check off in-flight legacy phase items and (b) carry the §5 supersession notes below.

---

## 2. Alignment verdict (2026-06-16)

| Axis | Verdict | One-line basis |
|---|---|---|
| MASTER_TRACKER ↔ EPICS plan | **Drifted** | Tracker frozen 2026-06-10; zero references to A–H / BUILD-STATUS / the #548–#719 stream. The two systems never linked. |
| MASTER_TRACKER ↔ lessons learned | **Partially aligned** | ~6 lessons machine-enforced via husky/CI; the recurring **service-layer publicId** class has **no guardrail** and the 16 pitfalls + 10 UX laws are doc-only. |

This charter is the fix for axis 1 (it links the systems) and the tracking home for axis 2 (the guardrail backlog in §6/§8).

---

## 3. Live epic ledger — A–H (grounded in PR history + BUILD-STATUS)

| Epic | Prio | Status | Evidence |
|---|---|---|---|
| **A** Budget Edit & EVM Reconnect | P0 | ✅ merged | #701 |
| **B** Client Management UI | P0 | ✅ merged | #700 (+ actor-audit) |
| **C** Planning Toolbar + Workspace Density | P1 | 📐 spec'd (design-led) | `E7-planning-gantt-density.md`; backlog `EPIC-C-*`. Next: Claude Design prompt → C1 PlanToolbar / C2 Gantt-headline |
| **D** Real Directory Sync (M365 Graph + LDAP + OIDC) | P1 | 🔶 partial | D1 ✅ (#703 OIDC governance); D2 verified honest. **Next: D3** concrete M365 Graph adapter, **D4** wire LDAP adapter + admin Run-sync/Test-connection |
| **E** Jira PPM + JSM Case Sync | P1 (dep D) | ⏳ not started | extends D's reconciliation engine |
| **F** 1C (1С:Предприятие) HRIS Adapter | P1 (dep D) | ⏳ not started | dominant CIS HRIS; rides D's engine |
| **G** Budget/Param Import + EVM cron | P2 (dep A) | ⏳ not started | XLSX import via SheetJS through A's governed write path; batch/suppress approval flood |
| **H** Custom Integration Connector Builder | P3 (dep D/E/F) | ⏳ not started | XL; **security-gate** SafeURL + allowlists + credential vault before flag promotion |

**Cross-cutting (tracked in BUILD-STATUS):**
- **SC-7** UUID→name captions — 🔶 keystone done (#706 positions-list enrichment) + Create-Case (#705); **~90 sites remain** (people/projects/cases) — same DTO-enrichment pattern.
- **F-HEALTH-EMPTY** empty-project RAG → N/A — ✅ shipped #708 (was: empty DRAFT projects fabricated "Healthy"). _BUILD-STATUS still lists it ⏳ — stale; reconcile._
- **E10** chunk-load resilience — ✅ #704.

**Build sequence:** Wave 1 `[A][B][C]` → Wave 2 `[D]` (identity engine, gates E/F/H) → Wave 3 `[E][F]` → Wave 4 `[G]` → Wave 5 `[H]`.

---

## 4. Post-roadmap bug-fix stream (also not in MASTER_TRACKER)

Shipped + live-verified on v2 after the tracker froze:
- **Position-flows remediation** — Waves 1–7, #658–#685 (28 findings; decisions A–G; atomic create-and-book; canonical `fillStatus`).
- **Staffing-desk 500s** — #686 (empty `requestedByPersonId` → UUID filter) + #687 (planner `Invalid Date` → Prisma filters). Both **200 live** on v2.
- **Person-view 500** — #721 (in flight): `/people/:id/profile` + `/suggested-positions` 500'd for director/hr because the services didn't resolve publicId (the `ParsePublicIdOrUuid` pipe validates but does not resolve). **This is the third recurrence of the same class** (#685 history → #719 controller-only → #721 services) → see guardrail gap §6.

---

## 5. MASTER_TRACKER supersession map (resolve the stale-active rows)

The tracker shows **8 phases simultaneously `🔄 In Progress`**. Reconciled reality:

| Tracker phase | Real disposition |
|---|---|
| Phase V2 (DS Redesign cutover) | **Active baseline.** Defers to V2 SoT plan; its own checkboxes are stale-not-pending. V2 is "done enough" to be the surface A–H build on. |
| Phase WO (Assignment Workflow Overhaul) | **Superseded** by the lean `ProjectPosition` model + position-flows remediation (§4). WO-4.12's target page was deleted by V2 PR 17b. Mark `[-]` superseded. |
| Phase DS (Design System Standardization) | **Folded into** V2 + the Lean DS-Regeneration epic. 42/52 done; treat remaining as V2-scope. |
| Phase CC (Console Cleanup) | **Effectively closed** (0 errors/57 routes, 2026-04-24); 5 deferred follow-ups. Mark ✅ + carry deferred items. |
| Phase DM (Data Model Remediation) | **Genuinely active** — DM-2.5 publicId rollout (2/10 aggregates) is the relevant blocker; the §4 person-view bug is a DM-2.5 symptom. |
| Phase 20c / Phase 21 | Long-tail cleanup/uplift — lower priority than A–H. |
| Phase BANK-IT | Strategic framing for the CIS/bank pivot — now **operationalized by EPIC-ROADMAP** (D/E/F/1C/DC). |

**Status-count conflict (unresolved corpus-wide):** Phase CSW says "**9 statuses**"; lean targets a **7/8-state** `fillStatus` collapsing the legacy 10/11. Canonical statement needed: _"9 assignment states + 5 derived SR states; the lean aggregate uses an 8-value `ProjectPositionFillStatus`."_ Reconcile before any legacy-table drop.

---

## 6. Guardrail ledger (lessons → enforcement)

**Machine-enforced (husky/CI) — keep green:**

| Lesson | Guardrail |
|---|---|
| No raw hex outside token files | `tokens:check` (`check-design-tokens.cjs`) — empty baseline, hard gate |
| DS primitive/grammar conformance | `ds:check` |
| No raw UUIDs leaking at the **controller/DTO boundary** | `publicid:check` (controller-uuid-leak) |
| Migrations idempotent + classified + schema-hash pinned | `migrations:check` (DM-R-4/6), DM-R-2 schema-hash, DM-R-13 contracts |
| Role arrays centralized | `roles:check` |
| Every FK has a covering index | `fk-indexes:check` |
| CI green before AND after merge | branch protection + post-merge build-and-stage watch |

**GAP — not enforced (the highest-value finding):**

> **`publicid:service-check` (MISSING, P0).** `publicid:check` guards the controller/DTO boundary, **not** a publicId reaching Prisma **inside a service**. This exact class has recurred **three times** (#685 → #719 → #721). Needed: a lint/test that fails the build when a publicId-accepting service hits `prisma.*.findUnique/findFirst({ where: { id } })` without resolving via `looksLikeUuid`/`PublicIdService` first. **This is the top reconciliation action (§8).**

**Doc-only (human discipline, not enforced):** the 16 `CLAUDE.md` §8 pitfalls (useState-prop-sync, Prisma-select completeness, fixture-sync, modal-hooks, no `window.confirm`, no hardcoded UUIDs/asOf, …) and the 10 UX laws. Candidate enforcement listed in §8.

---

## 7. The development loop (run every iteration)

A repeatable cycle. Each pass advances one epic/slice and keeps the alignment honest.

```
1. ORIENT   → read BUILD-STATUS.md "Epic status" + "next"; pick the highest-value ready item
              (deps satisfied). Cross-check this charter §3/§8 for blockers.
2. GROUND   → read from origin/main or a fresh worktree (NEVER the local checkout — it drifts;
              currently 171 commits behind). Read the exact wire the page/feature uses.
3. BUILD    → flag-gated, surgical change in a worktree off origin/main. Follow existing patterns.
4. PROVE    → unit/regression test that FAILS without the fix; tsc clean; husky green.
              Add/repair fixtures in the same change.
5. SHIP     → PR (issues referenced as "issue N" not "#N" in code/comments — token guardrail);
              CI green; squash-merge from the MAIN checkout (not the worktree — avoids the
              'main already used by worktree' error).
6. DEPLOY   → v2 preview is a MANUAL deploy: `gh workflow run build-and-stage-v2.yml --ref main`.
              A fix on main is NOT live on v2 until this runs.
7. VERIFY   → probe the EXACT endpoint the PAGE calls, with a real role token, on
              deliverit-test-v2. 200 + correct body, or pull the stack trace from
              `docker logs dc-v2-staging-backend-1`. Never claim "works" from an adjacent probe.
8. RECORD   → tick BUILD-STATUS.md; if a new lesson emerged, add it to §6 and (if enforceable)
              file a guardrail item in §8. Update this charter's verdict if alignment changed.
```

**Convergence for "full alignment":** §8 backlog empty (or every item dispositioned), the two trackers cross-reference each other, and the verdict in §2 reads "Aligned" on both axes.

---

## 8. Open reconciliation backlog (the loop's worklist)

Ranked. Each is a checkbox so this doc doubles as the alignment tracker.

- [x] **R1 — Link the two trackers.** Top-of-file pointers added in `MASTER_TRACKER.md` and `BUILD-STATUS.md` to this charter. _(done in the PR introducing this doc.)_
- [ ] **R2 — `publicid:service-check` guardrail.** Lint/test that fails on an unresolved publicId reaching Prisma in a service. Closes the #685→#719→#721 recurring class. **P0.**
- [ ] **R3 — Re-sync MASTER_TRACKER to HEAD.** Apply the §5 supersession dispositions (mark WO `[-]`, CC ✅, fold DS); add a one-line "post-2026-06-10 work tracked in BUILD-STATUS" note. Do **not** re-import A–H into MASTER_TRACKER.
- [ ] **R4 — Reconcile BUILD-STATUS stale rows.** F-HEALTH-EMPTY is ✅ #708 but listed ⏳; correct it.
- [ ] **R5 — Publish the canonical staffing status-count statement** (§5) and cross-link `canonical-staffing-workflow.md`.
- [ ] **R6 — Finish #721 + the @AllowSelfScope publicId follow-up** (employee self-view of `/people/:id` by publicId still 403s — guard compares `principal.personId` UUID to the publicId param).
- [ ] **R7 — Pull the local checkout** (171 behind origin/main) and resolve the stray uncommitted `MASTER_TRACKER.md` edit, so local reads stop being misleading.
- [ ] **R8 — Candidate guardrails for doc-only lessons** (lower priority): UX-Law-9 dev `console.warn` on hrefless StatCard, a Prisma-select completeness lint, a fixture generator for shared-type changes.

---

_This charter is maintained by the alignment development loop. When the §8 backlog is empty and §2 reads "Aligned/Aligned", the loop has converged — re-open it whenever a new tracker/plan/lesson is introduced._
