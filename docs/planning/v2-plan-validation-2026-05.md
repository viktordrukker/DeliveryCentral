# Phase V2 Plan Validation — Bank-IT Go-Live Lens

**Date:** 2026-05-29
**Author:** product/BA validation pass (Claude Code)
**Scope:** Validate the Phase V2 plan in `MASTER_TRACKER.md` against the strategic goal — a 100% match with the new design system **and** adoption of the lean supply×demand / staffing / resource-planning flows for **fast onboarding of an upcoming bank client's IT block**.
**Method:** 4 parallel audits — (A) full Phase V2 tracker inventory, (B) lean-simplification + bank-IT onboarding docs, (C) DS canvas (`DS/`) + `current-state.md`, (D) live codebase audit of the four core capabilities.

---

## Verdict

The plan is well-built for **design-system adoption** but **mis-anchored for the strategic goal.** The headline "~41% done" is genuine for DS cosmetics and **≈5–10% for lean-flow go-live** — the work that actually delivers the bank's value.

The lean staffing model (`ProjectPosition`) — which *is* the supply×demand / staffing / resource-planning product — is **built but shelved in parallel.** Every live surface (Staffing Desk, supply/demand profiles, workforce planner, dashboards) still reads the **legacy** `ProjectAssignment` / `StaffingRequest` model. The cutover that makes the lean flows real is buried as a long tail inside V2-H and is **0% started.**

> **Onboarding the bank today delivers the *legacy* flows wearing the new design system — not the lean flows the strategy promises.**

---

## 1. Strategic goal → measurable outcomes

| Pillar | Definition of done |
|---|---|
| 100% DS match | Bank-critical surfaces (Desk, Pulse, Plan/Money, Approvals, Director, Bench, Workspace) render the canvas grammar; `dsRefresh` ON in prod; visual-regression green. *(cosmetic token + conformance baselines already at 0)* |
| Lean flows adopted | The 5 lean flows (position → suggest → propose/book → onboard → release) run **on `ProjectPosition` as the live read path**; legacy models dropped; bench = query result. |
| Supply×demand | Demand (open positions) vs supply (people/capacity) computed from `ProjectPosition`. |
| Resource planning | Distribution Studio editable swimlane + capacity that reserves approved leave. |
| Fast onboarding | Install wizard + Create-Project-Wizard pre-fills positions; bank SSO / custom RBAC / locale / currency configurable Day-1. |

---

## 2. Critical finding — the lean model is parallel, not live

- `src/modules/project-positions/` is **complete** (8-state aggregate `DRAFT→OPEN→PROPOSED→BOOKED→ONBOARDING→ASSIGNED→ON_HOLD→RELEASED`, 7 endpoints, `ProjectPositionCandidate` + `ProjectPositionFillHistory`, `project-position-mirror.service.ts` dual-write) — ~60% of lean sprint S2.
- **But** `staffing-desk.service`, `supply-profile.service`, `demand-profile.service`, `workforce-planner.service`, and all dashboards **query legacy `ProjectAssignment` + `StaffingRequest`.** No live read hits `ProjectPosition`.
- The S5 "contract phase" (migrate **21 legacy callsites** → `ProjectPosition.activeFill`; drop 10 legacy models) — the work that flips lean from shelf to live — is **not started** and is the lean docs' own #1 risk (single point of failure).

**Consequence:** the tracker's progress metric conflates two scopes. DS-adoption ≈ 41% (genuine). **Lean-flow-live ≈ 5–10%** (model built, not wired). The strategic goal tracks the second number, which the current sub-phase structure hides.

---

## 3. Capability coverage (bank JTBD → reality)

| Bank JTBD | Live? | On lean model? | DS-wired? | Status |
|---|---|---|---|---|
| Open demand vs available supply | yes | ❌ legacy | partial | 🟠 works, wrong model |
| Fill a position (suggest→propose→book) | yes (15-step legacy) | ❌ legacy | partial | 🟠 not lean |
| Release person → bench | yes (legacy duality) | ❌ legacy | partial | 🟠 not lean |
| Plan resources (Distribution Studio) | scenarios+solver, no swimlane edit | ❌ legacy | partial | 🟠 |
| Capacity reflects approved leave | ❌ not reserved | — | — | 🔴 gap |
| Approve (1-screen, all sources — Law 7) | case+budget only | n/a | partial | 🟠 |
| Project Pulse / Plan / Money | Radiator v1 shipped | n/a | Gantt + pulse-endpoint gaps | 🟢/🟠 |
| Fast onboarding (wizard + seed) | functional | n/a | yes | 🟢 |
| Bank SSO / custom RBAC / multi-currency / fiscal | settings exist, **not consumed**; SSO/role admin UI pending | n/a | partial | 🔴 Day-1 blockers |

---

## 4. Sub-phase validation

| Sub-phase | Verdict |
|---|---|
| **V2-D, V2-E, V2-F** (done) | ✅ Verified genuinely complete (ds-conformance 0, token baseline 0). Keep. |
| **V2-A** (3 open) | A.3 Gantt + A.9 Staffing Desk are strategically core but BE-blocked/large → move to the lean track. A.11a MUI removal = hygiene; **de-prioritize**. |
| **V2-B** (open) | ⚠️ Mostly vanity metrics. "Money ≥50 / MiniBars ≥10 / Donut ≥6 callsites" are adoption counters, not user value. **Re-scope** to "DS atoms on bank-critical surfaces only"; **cut** the count targets. **B.9 BalanceMeter = already complete** (only 2 leave surfaces exist; both use it). B.13 Icon set has real downstream value (unblocks A.11a). |
| **V2-C** (14 open) | 🎯 Resource-planning killer feature — strategically central, but mixes FE atom-props (C.1–C.3), JQL (C.4–C.9, half BE), Distribution Studio UI (C.10–C.13). **Promote** Distribution Studio + capacity; **defer** JQL-tabs (power-user nicety, not Day-1). |
| **V2-G** (16 open) | Cutover + legacy cleanup. Correct but **downstream** — gated on lean-flows-live + soak. Don't start G.6–G.16 cleanup until C0. **Pull G.1 visual-regression forward** as a quality gate. |
| **V2-H** (29 open) | ⚠️ **Misclassified as "finishing."** Holds the load-bearing strategic work: H.10–H.16 (lean S2 finish + S5 contract migration), H.23 (pulse endpoint), H.8 (capacity reserves leave), H.3/H.19/H.20 (currency/fiscal). **These are not finishing — they are the product.** Extract into a top-priority track. |
| **V2-X** (7 open) | Docs/meta. Keep, low effort. |

---

## 5. Gaps to ADD (not currently first-class items)

1. **Re-point live reads to `ProjectPosition`** — supply/demand-profile + staffing-desk + dashboards must *read* the lean aggregate, not just dual-write to it. This is the missing bridge between "model built" and "lean flows live"; implied by H.13 but not scoped as the explicit go-live gate.
2. **Capacity reserves approved leave** — planner must subtract approved-leave hours (H.8 exists but isolated; no outbox cache-invalidation wired).
3. **Bank Day-1 config surfaces** — SSO admin UI (D-155), custom-role admin (D-159 — Squad/Tribe Lead, IT Service Owner), base-currency admin tab (H.3), locale/fiscal **consumption** (settings exist, unused). The bank runbook flags these as go-live blockers; the tracker barely represents them.
4. **One-screen unified approvals (Law 7)** — position-proposal + leave + activation + skill-review sources with inline approve/reject. Currently case + budget only.
5. **Onboarding accelerator** — Create-Project-Wizard pre-filling positions/milestones from a bank template (the real "fast onboarding" lever beyond the install wizard).

---

## 6. Recommended re-sequence — value-ordered tracks

Replace the V2-A→B→C→G→H reading order with outcome-anchored tracks (item IDs reference existing tracker entries; `NEW-*` are gaps from §5):

**Track 1 — Lean Go-Live (CRITICAL PATH).** Until this lands, nothing else moves the strategic needle.
`V2-H.10` backfill → `NEW-LGL-1` re-point reads to `ProjectPosition` → `V2-H.13` migrate 21 callsites → `V2-H.14` drop legacy models → `V2-H.15` deprecated-import ratchet → `V2-H.11/H.12` positions + bench skeletons.

**Track 2 — Bank Day-1 config.**
`NEW-LGL-2` SSO admin UI (D-155) · `NEW-LGL-3` custom-role admin (D-159) · `V2-H.3` base-currency tab · `V2-H.19/H.20` currency/fiscal flag flips · locale/fiscal consumption · `NEW-LGL-4` Create-Project-Wizard accelerator.

**Track 3 — Resource-planning depth.**
`V2-C.11–C.13` Distribution Studio swimlane + heatmap + bench sidebar · `V2-H.8` capacity-reserves-leave · `V2-A.3` Plan Gantt (once workstream BE lands) · `V2-C.1–C.3` editable-Timeline props (build only when the consumer is in the same sprint — avoid speculative atom props).

**Track 4 — DS finish for bank surfaces only.**
`NEW-LGL-5` Law-7 unified approvals · the ~4 canvas-wiring gaps (JQL bar, Gantt render, Leave drawer, profile 360) · `V2-B.13` Icon set → `V2-A.11a` MUI removal. **Drop** the V2-B callsite-count targets.

**Track 5 — Cutover.**
`V2-G.1` visual-regression → soak (`V2-G.3`) → `V2-G.4` `dsRefresh` flip → `V2-G.6–G.16` C1 cleanup.

---

## 7. What changed in the tracker from this validation

- **Safe corrections:** V2-B.9 marked done (verified); lean-model-parallel finding annotated on V2-H.13/H.14; Phase V2 status line now carries the dual-scope metric (DS-adoption vs lean-flow-live).
- **Additive restructure:** a "Strategic Track Map (Bank Go-Live)" block added to the Phase V2 section, grouping existing item IDs into the 5 value-ordered tracks above plus the `NEW-LGL-*` gap items. Existing sub-phase items were **not** reordered or removed (per the tracker-integrity rule) — the track map is an organizing layer over them.

---

## 8. Open decisions for the human

- **Track 1 is BE-heavy and overlaps the concurrent agent's staffing/workstream territory.** Sequencing it requires confirming who owns the `ProjectPosition` read-path re-point and the S5 contract migration.
- The lean contract migration (drop 10 legacy models) is forward-only and the docs' #1 risk — it needs a dedicated, well-tested sprint, not a long-tail slice.
