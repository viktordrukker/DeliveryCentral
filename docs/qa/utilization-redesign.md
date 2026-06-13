# Utilization Report — Product/BA Assessment & Redesign

**Route:** `/reports?section=utilization` → `frontend/src/routes/reports/UtilizationPage.tsx`
**Backend:** `src/modules/reports/application/utilization.service.ts` · `GET /api/reports/utilization`
**Binding design spec:** `DS/page-reports.jsx` Tab 2 (lines 244–398)
**Persona JTBD:** Resource Manager — *"see idle people, underallocation, overallocation, and future pipeline so I can rebalance staff before conflicts become escalations"* (`docs/planning/persona-jtbds.md:41`)
**Author:** Product/BA + Design lead · 2026-06-13

---

## 1. Product Verdict

**Does a utilization report make product sense here?** **Yes — emphatically.** It is the single most important artifact of the Resource Manager's #1 job. The RM's recurring decision is a *rebalance* decision: pull work off the over-booked, fill the under-booked from the bench, before paper over-allocation turns into a delivery conflict or an escalation. A report that surfaces who is over/under and lets the RM act in one or two clicks is core, not nice-to-have.

**Is the current execution clear and correct?** **No — on two counts.**

1. **The metric is mislabeled and subtly wrong.** What the page calls "Utilization %" is *not* utilization. It is **planned allocation %** — the uncapped sum of a person's active position booking percentages. The math in the service algebraically cancels `availableHours`, so `utilizationPercent ≡ Σ activeAllocationPercent`. The product *collects* real worked hours (`actualHours` from approved timesheets) and then **throws them away from the headline number**, surfacing them only as a quiet table column. So "104% Avg Utilization" actually means "the average person is paper-booked to 104% of an 8h/day baseline" — an over-booking signal, not "people working 104% of capacity."

2. **The chart buries the decision.** It ranks all ~30 of 63 people in one undifferentiated traffic-light block. The 14 over- and 11 under-allocated people who *drive the rebalance* are not separated from the healthy middle, there is no team rollup, no over/under flag, and no row drills to the person — so an RM who spots a problem here cannot act on it.

**A note on the user's specific complaint.** The user reports "2–3 stacked bars per person, no legend, no x-axis scale, no metric definition." In current source (`/tmp/dc-fix`) those artifacts technically *exist*: one bar per person (not 2–3), an x-axis with `%` unit and `[0,140]` domain (line 207), a 5-band color legend (lines 218–231), and a subtitle definition (line 143). The "2–3 stacked bars" the user perceives is a **visual artifact** — ~30 thin 28px traffic-light bars crammed vertically read as a noisy multi-color block. The most likely root cause of the *missing* legend/axis is a **stale deployed build** predating commit `a61a578a` (#507), which added the KPI strip, axis unit, and legend. **Action item: confirm the live build matches source — the deploy lag is a real defect on its own.** Regardless, the user's underlying read ("I can't tell what this means or what to do") is correct and is a genuine product problem the redesign must fix.

**Bottom line:** Redesign — yes. But the headline problem is not "missing legend/axis" (those already exist). It is (a) a mislabeled, half-discarded metric and (b) a chart that hides the outliers and dead-ends the decision. The fix is mostly free: `availableHours`, `assignedHours`, `actualHours`, and `utilizationPercent` are all already on the wire.

---

## 2. What's Wrong

| # | Problem | Evidence | Impact |
|---|---------|----------|--------|
| 1 | **Naming lie — "Utilization" measures allocation.** `utilizationPercent = assignedHours/availableHours`, but `assignedHours = (Σ alloc% / 100) × availableHours`, so it reduces to `Σ alloc%`. | `utilization.service.ts:108–120` | RM thinks the number is realized work; it's paper booking. A person booked 120% who logged 40h reads "Critical" identically to someone genuinely burning out. |
| 2 | **Actual hours collected, then discarded.** `actualHours` from approved `TimesheetWeek` is fetched but never enters the percent — table column only. | `utilization.service.ts:80–95, 110` | The single most valuable view — *plan vs. actual* (booked but not delivering?) — is invisible. The data is right there. |
| 3 | **Chart shows the healthy middle, not the outliers.** One `<Bar dataKey="pct">` per person, `slice(0,30)`, colored by 5-band threshold. | `UtilizationPage.tsx:125–128, 201–217` | The 14 over / 11 under that drive the decision don't stand out from the noise. No team rollup. Opposite of the DS canvas. |
| 4 | **No plan-vs-actual contrast in the viz.** Single allocation-only series; no dual encoding, no 70/110 threshold marks, no target band. | `UtilizationPage.tsx:210` | Can't see the gap between booked and delivered. DS canvas specs exactly this (billable + allocated overlay). |
| 5 | **Dead-end for the job (UX Law 2/9).** Rows don't link to person Profile / Bench / Staffing Desk. | table `UtilizationPage.tsx:243–263` | RM spots an over/under person and *cannot act* without leaving and re-finding them. Canvas mandates row-click → Profile. |
| 6 | **Thresholds unexplained.** Bands are a color key with no "what good looks like" or business action. | legend `218–231` | "104%" / "14 over-allocated" carry no target (e.g. 80–100% healthy) and no action ("> 120% = escalate to RM"). |
| 7 | **Diverges from the binding DS canvas on every major element.** Hero is per-PERSON not per-TEAM; no billable/allocated split; no 70/110 marks; no Team column/Flag/float-to-top/Profile drill; bespoke inline `UtilizationBar` instead of the shared util-cell; an un-specced 4-tile KPI strip the canvas deliberately omits. | `DS/page-reports.jsx:244–398` vs `UtilizationPage.tsx`; QA `dsgap-page-reports.json` verdict PARTIAL | The clearer view is already specified — the implementation simply diverged from it. |
| 8 | **(Likely) stale deployed build.** User's screen lacks legend/axis that exist in source since `a61a578a` (#507). | git `a61a578a^` already had axis+legend | The exact screen the user describes is not in git → deploy lag, a defect in its own right. |

---

## 3. What It Should Be

### 3.1 The right metric(s)

Stop conflating two distinct numbers. Surface **both**, named honestly:

| Metric | Formula | Means | Source (already on wire) |
|--------|---------|-------|--------------------------|
| **Allocation %** (default) | `assignedHours / availableHours` ≡ `Σ active alloc%` | How heavily *booked* on paper (can exceed 100% = multi-project over-booking) | `assignedHours`, `availableHours` |
| **Actual utilization %** (toggle) | `actualHours / availableHours` | How much of capacity was *actually worked/logged* | `actualHours`, `availableHours` |

- Rename the headline from "Utilization" → **"Allocation %"** (the default view), with a **Planned / Actual toggle** that switches both the chart and KPIs.
- Keep the over/under thresholds but tie each to a **business action**, not just a color:
  - **0–70% Under-allocated** → fill from Bench / open positions.
  - **70–110% Healthy** → no action (the target band).
  - **> 110% Over-allocated** → rebalance: split or pull work.
  - **> 120% Critical** → escalate to RM.
- *(Aligns thresholds with the DS canvas's 70/110 marks rather than the current 50/80/100/120 bands, which were never explained against a target.)*

### 3.2 The right visualization

Per the binding DS canvas (`page-reports.jsx` Tab 2), the hero is a **per-team** rollup, and the table floats the **outliers**:

- **Hero = Utilization by *team*** (6–8 horizontal bars), dual-encoded:
  - **Solid bar = billable/actual**, **translucent overlay = allocated/planned** — so the gap between booked and delivered is visible at a glance.
  - **Threshold marks at 70% (under) and 110% (over)** as vertical reference lines.
  - 3-item legend naming **Billable · Allocated · 70/110 thresholds** (replaces today's 5-band color key).
  - Click a team → filter the table to that team (Law 9).
- **Supporting table = "By person · outside 70–110%"**, outliers floated to the top, sorted by distance from the band:
  - Columns: **Person (avatar + link) · Team · Billable% · Allocated (util-bar cell with 100% mark) · Flag (Over/Under badge) · → (open Profile)**.
  - Reuse the **shared Staffing-Desk `.util-bar`/`.over-track` cell** — identical encoding everywhere Σ-allocation appears — not a bespoke inline bar.
  - **Row-click → person Profile**; offer **"Fill from Bench" / "Open in Staffing Desk"** as the forward action, since rebalancing is the whole point (Laws 2 + 9).
- **One-line metric-definition box** above the hero: *"Allocation % = sum of a person's active position allocation. > 100% = booked on multiple projects beyond an 8h/day baseline. Actual % = approved timesheet hours ÷ available hours."*

> **Canvas vs. repo conventions — a reconciliation note.** The DS canvas deliberately omits a KPI strip ("the hero chart IS the summary"). The repo's analysis-surface grammar (CLAUDE.md §9, and the existing build) uses a KPI strip with Law-9 drilldowns. **Recommendation:** keep a *slim* KPI strip (People · Avg Allocation · Over-allocated · Under-allocated) because the existing build already trained users on it and Law 9 wants clickable summary numbers — but make every tile a **drilldown** (filters the table) with a **TipBalloon definition**. If strict canvas conformance is required, drop the strip and let the team hero carry the summary. Flag this as a **product decision for the owner**, not a silent choice.

### 3.3 The decision it should drive

> *Rebalance over-allocated people onto under-utilized capacity before paper over-booking becomes a delivery conflict.*

The report must (1) make the ~14 over and ~11 under **pop** (float outliers, roll the healthy middle up to team level), (2) make every number a **drilldown** (team → table, person → Profile), and (3) put the **forward action** (Bench / Staffing Desk) within reach of the row — so the RM acts in 1–2 clicks, never dead-ends.

---

## 4. Claude Design Prompt (ready to paste)

```
Redesign the Utilization Report at /reports?section=utilization
(frontend/src/routes/reports/UtilizationPage.tsx). It conforms to the
Analysis Surface grammar (CLAUDE.md §9) and the binding DS canvas
DS/page-reports.jsx Tab 2 (lines 244–398). Use design tokens only
(--color-status-*, --color-accent, --color-text-*, --color-surface-*),
DataTable/Table for tabular data, SectionCard framing, StatusBadge for
flags, TipBalloon for definitions, and Sparkline if a trend is shown.
Do NOT invent data — every field (availableHours, assignedHours,
actualHours, utilizationPercent) already comes from
GET /api/reports/utilization (UtilizationPersonRow).

CONTEXT — the metric is wrong today. utilizationPercent is PLANNED
allocation (Σ active position alloc%, uncapped, can exceed 100%);
actualHours (approved timesheet hours) is fetched but unused in the
visual. The RM's job is to REBALANCE: pull work off the over-booked,
fill the under-booked from the bench, before over-allocation becomes
an escalation (persona-jtbds.md:41).

DELIVER:

1. METRIC HONESTY. Rename the headline metric "Utilization" →
   "Allocation %". Add a Planned / Actual toggle that switches BOTH the
   chart and the KPIs:
     • Planned  → assignedHours / availableHours  (≡ Σ alloc%)
     • Actual   → actualHours   / availableHours
   Add a one-line definition box above the hero:
   "Allocation % = sum of a person's active position allocation; >100%
   = booked on multiple projects beyond an 8h/day baseline. Actual % =
   approved timesheet hours ÷ available hours."

2. HERO = per-TEAM utilization (roll people up to team), horizontal
   bars, dual-encoded per the canvas: solid bar = billable/actual,
   translucent (0.35 opacity) overlay = allocated/planned, with
   vertical threshold marks at 70% (under) and 110% (over). 3-item
   legend: Billable · Allocated · 70/110 thresholds. Click a team →
   filter the table to that team (UX Law 9).
   (If no team aggregation is available client-side, group
   UtilizationPersonRow by the person's team from the directory; if
   team is not on the row, add it to the API — see ACTION LIST.)

3. TABLE = "By person · outside 70–110%". Float outliers to the top,
   sorted by distance from the 70–110% band. Columns:
   Person (avatar + link) · Team · Billable% · Allocated (reuse the
   shared Staffing-Desk .util-bar / .over-track cell with a 100% mark,
   NOT a bespoke inline bar) · Flag (StatusBadge: tone="warning"
   Overallocated / tone="info" Underallocated) · → open Profile.
   Row-click → person Profile (Law 9). Add a row action
   "Open in Staffing Desk" / "Fill from Bench" so the RM can act
   without leaving (UX Law 2 — no dead end).

4. KPI STRIP (slim, optional per owner decision — see redesign doc
   §3.2). 4 tiles: People · Avg Allocation · Over-allocated (>110%) ·
   Under-allocated (<70%). EACH tile is a clickable drilldown that
   filters the table (UX Law 9) and carries a TipBalloon defining the
   band thresholds and the action to take (>120% = escalate; <70% =
   fill from bench).

5. Keep filters in URL params (Law 5): from, to, team, threshold.
   Keep Export XLSX exporting the CURRENT filter state.

CONSTRAINTS: tokens only (no raw hex), no mock data, follow
AnalysisLayout. Match the canvas's encoding exactly so the util-bar
cell is identical to the Staffing Desk.
```

---

## 5. Action List (FE + BE)

### Backend — `src/modules/reports/application/utilization.service.ts`
- **BE-1 (metric correctness).** Stop discarding `actualHours`. Return an explicit `actualUtilizationPercent = round(actualHours/availableHours*100)`. Keep `utilizationPercent` as-is but treat it as **allocation** (rename the *concept* in docs/labels; the field name can stay for compat or be added alongside `allocationPercent`).
- **BE-2 (team rollup).** Add `team` / `orgUnitName` to `UtilizationPersonRow` (join `Person.orgUnit`), OR add a `byTeam` aggregate to `UtilizationReport` (`{ team, billable%, allocated% }`) so the FE hero needn't re-aggregate. Prefer the aggregate — the canvas hero is team-level.
- **BE-3.** Expose the threshold config (70/110) or document it as fixed; ensure `availableHours > 0` guard stays.
- **BE-4 (test).** Unit test asserting `utilizationPercent === Σ alloc%` (lock the documented semantics) and `actualUtilizationPercent === actualHours/availableHours`.

### Frontend — `frontend/src/routes/reports/UtilizationPage.tsx` + `frontend/src/lib/api/utilization.ts`
- **FE-1 (rename + toggle).** Headline "Utilization" → "Allocation %". Add Planned/Actual toggle (URL param) switching chart + KPI source between `assignedHours`/`availableHours` and `actualHours`/`availableHours`.
- **FE-2 (hero → team).** Replace the per-person `<Bar dataKey="pct">` with a per-team dual-encoded bar (solid billable + translucent allocated overlay + 70/110 `ReferenceLine`s). Consume `byTeam` from BE-2. Team click → table filter.
- **FE-3 (shared util cell).** Delete the bespoke `UtilizationBar` (lines 45–70); import/reuse the Staffing-Desk `.util-bar`/`.over-track` cell for identical encoding.
- **FE-4 (outlier table).** Add Team column + Flag (StatusBadge) column; default-sort outliers (outside 70–110%) to the top; row-click → person Profile; add "Open in Staffing Desk" / "Fill from Bench" row action (Law 2).
- **FE-5 (KPI drilldowns + tips).** Make all 4 KPI tiles clickable filters (Law 9) with TipBalloon definitions tied to actions. Recompute Under threshold to **< 70%** to match the band.
- **FE-6 (definition box).** Add the one-line metric definition above the hero.
- **FE-7 (filters in URL).** Add `team` + `threshold` to URL params alongside `from`/`to`; Export exports current filter state.
- **FE-8 (tests).** Update `UtilizationPage.test.tsx`: toggle switches metric, KPI drilldowns filter, outliers float, row → Profile link, util-cell reused.

### Ops / deploy
- **OPS-1 (deploy-lag fix).** Confirm the live build at `/reports?section=utilization` matches source ≥ `a61a578a` (#507). The user's "no legend/axis" screen is not in git → redeploy and verify the legend, axis unit, and KPI strip render live. This is a standalone defect independent of the redesign.

### Decision for the product owner
- **DEC-1 (KPI strip).** Canvas says "no KPI strip — the hero IS the summary." Repo grammar + existing build use one. Choose: keep a slim, drilldown-enabled strip (recommended for Law 9 continuity) **or** drop it for strict canvas conformance. Do not decide silently.

---

## 6. Effort & Sequencing

| Wave | Tasks | Why |
|------|-------|-----|
| **0 — unblock** | OPS-1 | Confirms the user even sees current source; cheap; clarifies what's a deploy bug vs. a design bug. |
| **1 — correctness** | BE-1, BE-4, FE-1, FE-6 | Stop lying about the metric; surface actual utilization; define it. Highest product impact, mostly free (data on wire). |
| **2 — decision viz** | BE-2, FE-2, FE-3, FE-4 | Team hero + outlier table + shared util-cell + Profile drilldown. Maps to the binding canvas and the RM job. |
| **3 — polish** | FE-5, FE-7, FE-8, DEC-1 | KPI drilldowns/tips, URL filters, tests, owner decision on the strip. |
