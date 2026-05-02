# Workforce Operations Platform: Benchmark Synthesis

## 1. Executive North Stars

1. **Heatmap-centric allocation** — Color-coded grid (people × weeks, % utilization) is the standard UX paradigm; drag-drop reassignment in 2 clicks beats nested dialogs.

2. **Dual-rate accounting** — Cost rate (what you pay; fixed per person) ≠ Bill rate (what you charge; project/role specific). Both must be effective-dated and override-able at person-level.

3. **Skills as first-class objects** — Tags + proficiency levels (not just text) enable skills-based matching; systems match by skill+availability before naming candidates.

4. **State machines over chaos** — Staffing requests move: Draft → Submitted → Approved/Rejected → Named Resource; soft-book, hard-book, and tentative states eliminate ambiguity.

5. **RAG + variance = visibility** — Health dashboards show Red/Amber/Green (schedule, scope, budget, resources); variance = EAC − Budget; burndown/burnup curves surface drift early.

---

## 2. Per-Domain Pattern Catalog

### DOMAIN 1: People (Onboarding, Lifecycle, Cost)

**Standardized Production Cost (SPC) as distinct field** (Source: Float, Kantata)
— Cost rate represents fixed employment cost (salary + overhead); set at person level, never varies by project; separate from bill rate. Enables accurate project margin math.

**M365/Azure AD SCIM sync** (Source: OpenAir, industry standard)
— When new hire added to Azure/Entra, SCIM provisioning creates user, pulls photos/roles, maps groups to skill tags automatically. Reduces manual onboarding steps.

**Skills as tags + proficiency level** (Source: Runn, Float)
— Employees tagged with skill clusters (e.g., "Backend", "DevOps", "React.js"); each tag has proficiency (L1–L5 or novice–expert). Enables skill-gap analysis and bench risk prediction.

**Effective-dated rate cards** (Source: Kantata, OpenAir)
— Cost/bill rates linked to start date; system auto-applies correct rate based on period. Supports salary bumps, project-specific markup without manual recalc.

**Pulse / satisfaction tracking via external integrations** (Source: industry pattern)
— Sentiment captured via pulse surveys, mapped to employee record; flagged in allocation decisions (over-allocated high-risk flight risk gets visibility).

**Release-to-bench workflow** (Source: Kantata, Resource Guru)
— Offboarding state: employee moved to "Bench" role; projects notified, backfill candidates surfaced; final cost accrual locked once fully released.

---

### DOMAIN 2: Staffing (Request → Proposal → Booking)

**Staffing request state machine** (Source: Kantata)
— States: Draft (unnamed resource) → Submitted (for approval) → Approved/Rejected → Confirmed (named). Custom required fields enforced at submit gate; rejector returns to requester with feedback.

**Proposal scoring with skills match** (Source: Runn, Kantata)
— Resource Manager proposes 3–5 candidates ranked by: skill match (tag + level), availability (% free), cost delta (SPC vs. project bill rate). Proposal UI shows candidate card with skill badges + availability mini-heatmap.

**Clash detection (real-time over-allocation alert)** (Source: Resource Guru)
— On save, system cross-references new assignment against existing bookings; if clash detected, flags with option to (a) add as overtime, (b) place on waiting list, (c) suggest alternative person.

**Soft-book vs. hard-book vs. tentative semantics** (Source: Resource Guru)
— Tentative: penciled in, no approval needed, not visible to resource; Soft-book: reserved but awaiting confirmation; Hard-book: confirmed, locked, visible on resource dashboard. Tentative→Hard triggers approval if settings enabled.

**Case management exception queue** (Source: Kantata, OpenAir)
— Exception types: Over-allocation (>100% week), Budget breach (estimated cost > project budget), SLA miss (proposal aging >X days), Skill gap (no candidate found), Candidate fall-through (accepted offer, then declined). Dashboard shows open exceptions + assignee.

**Onboarding-but-not-yet-billable state** (Source: Kantata, OpenAir)
— Resource booked but in "ramp" period (training, NDA, equipment setup). Time logged to non-billable "Onboarding" task; does not count toward billable utilization; transitions to billable on start date.

**SLA tracking on staffing turnaround** (Source: Kantata, industry standard)
— Staffing request created → Approved within SLA (e.g., 5 days) → Filled within SLA (e.g., 3 days of approval). Tracked in exception queue; escalates if missed.

---

### DOMAIN 3: Project Monitoring

**Project lifecycle states with approval gates** (Source: Kantata, OpenAir)
— States: Planning → Approved (budget locked) → Active → Complete → Closed. Gates at Approve (CFO sign-off on margin target) and at Close (all time/expense submitted + approved).

**Status aggregation via RAG + variance** (Source: Kantata)
— Dashboard rolls up per-project: Schedule health (on-track, slip risk), Scope health (change request count), Budget health (variance = EAC − Budget), Resource health (over-allocated %, bench %), Vendor health (SLA attainment %). Red thresholds configurable per org.

**Missing-timesheet detection + approval flow** (Source: Float, OpenAir)
— System generates daily/weekly "submit by" alerts; Project Manager approves time within period; unapproved hours flagged in cost reports; period lock (typically Friday EOD) prevents retroactive edits.

**Risk register integration** (Source: OpenAir, Kantata)
— Project risks tracked in linked Risk Register; risk owner, probability, impact, mitigation assigned; escalates if mitigation owner hasn't updated status within SLA.

**Vendor / subcontractor tracking** (Source: OpenAir, Kantata)
— Vendor records: name, cost rate (fixed or SOW-based), SLA metrics (delivery date, quality gates), invoice status. Actual spend vs. estimate tracked; late invoices flagged in cash-flow forecast.

---

### DOMAIN 4: Cost & Utilization

**BAC vs. AC vs. EAC formula stack** (Source: OpenAir, standard earned-value management)
— BAC (Budget at Completion) = planned cost at project creation; AC (Actual Cost) = sum of labor (hours × cost rate) + expenses to date; EAC (Estimate at Completion) = AC + (BAC − EV) or AC + ((BAC − EV) / CPI) for mature projects. ETC (Estimate to Complete) = EAC − AC.

**Project-level margin computation** (Source: Kantata, Float)
— Margin % = ((Revenue − Direct Labor Cost − Expenses) / Revenue) × 100. Direct Labor = sum of (hours logged to project × cost rate of person). Revenue = Invoice amount or SOW value. Negative margin = loss threshold for escalation.

**Org-level utilization metrics: billable %, productive %, bench %** (Source: Runn, Kantata, OpenAir)
— Billable % = billable hours / total available hours (target 70–80%); Productive % = billable + internal (training, admin) / total; Bench % = non-productive / total. Tracked by person, team, practice area; alerts at <65% or >85%.

**Burn rate & run rate for cash flow** (Source: OpenAir, Kantata)
— Burn rate = weekly direct cost (labor + approved expenses); Run rate = annual projected cost at current burn; Projected overrun = (current burn × weeks remaining − budget) flagged if >5%.

**Multi-currency rate card layering** (Source: Kantata, OpenAir)
— Employee SPC in home currency; project bill rate in client currency; system stores FX rate at booking time and locks it; P&L reports consolidated in home currency with realized + unrealized FX variance.

---

### CROSS-CUTTING: Supply & Demand Planning

**Capacity heatmap: grid rendering + fast assignment UX** (Source: Float, Runn)
— Grid: rows = people (sortable by capacity, team, skill); columns = weeks (zoom: day/week/month); cells = % allocation (color scale: white 0%, green 25–75%, yellow 75–95%, red >95%). Click cell → inline edit (drag slider, type %, paste person name) → save in <3 seconds. No modal.

**Demand pipeline: unstaffed roles surface** (Source: Runn, Kantata)
— Unfilled staffing requests + pipeline opportunities (proposals not yet booked) ranked by: revenue impact, skill scarcity, start-date urgency. Dashboard shows "Need 3 QA engineers by Apr 1" with suggested backfill candidates.

**Gap-fill workflows: drag-to-assign + suggested matches** (Source: Float, Resource Guru)
— Right-click empty cell in heatmap → "Suggest matches" → system ranks candidates by skills + availability + cost; drag candidate name onto cell → auto-fills person, start/end dates, estimated allocation %. Confirmation saves booking.

**Scenario / what-if planning** (Source: Runn, Kantata)
— Toggle "Tentative" mode; add hypothetical project or move person's allocations; heatmap updates in real-time showing impact on utilization; revert with one click. Supports multi-person reassignment in single scenario.

**Notification thresholds: over-allocated, under-utilized, bench risk** (Source: Runn, Kantata, Float)
— Alerts triggered: person >100% in any week; team avg utilization <65%; bench >20% 4+ weeks ahead; high-risk person (tenure <1yr OR satisfaction <3/5) allocated to critical path. Email to manager + flagged in dashboard.

---

## 3. UX Micro-Patterns (≤3 Clicks)

1. **Float: Assign person to project in heatmap**
   — Click person row, drag to project column + week, release → booking created with auto-duration; edit allocation % inline in same cell. 2 clicks.

2. **Runn: Create what-if scenario**
   — Click "New Scenario", name it, toggle tentative projects on/off, drag reallocations → heatmap updates live, SPI/CPI recomputed instantly. Revert with "Discard Scenario" button. 3 clicks to apply.

3. **Kantata: Propose staffing candidate**
   — Open staffing request, click "Propose Candidates" → filter by skill/availability, select 3 people → system auto-ranks by match + cost delta, click "Send Proposals", PM receives notification. 2 clicks to notify.

4. **Resource Guru: Detect + resolve clash**
   — Try to hard-book person in overlapping week → clash alert pops, click "Add as overtime" or "Waiting list" or person name to swap. 1 click to resolve.

5. **OpenAir: Lock timesheet period**
   — Finance clicks "Lock Period: Week Ending Apr 12" → system verifies all time/expense submitted + approved, prevents edits, triggers payroll export. 1 click.

---

## 4. Anti-Patterns to Avoid

1. **Heatmap without inline edit** — Requiring modal dialog to adjust allocation turns simple reassigns into 5-click operations; kills adoption for micro-adjustments.

2. **Single rate field** — Conflating cost rate + bill rate leads to margin math errors and over/undercharging clients; must be separate, both effective-dated.

3. **Skills as free-text tags** — Without proficiency levels or taxonomy, "React.js" ≠ "React" ≠ "node.js"; creates false negatives in matching; taxonomy + levels + auto-mapping (e.g., "React" ⊂ "Frontend") are non-negotiable.

4. **No clash detection on over-allocation** — Allowing >100% allocation silently creates promises you can't keep; systems must reject or escalate with high visibility.

5. **Timesheet approvals without period lock** — If people can edit submitted time retroactively, margin reports stay "soft" forever; lock dates + audit trail mandatory for finance credibility.

---

## 5. Pragmatic Minimums

Not a spacecraft—just enough to answer: "Where can our people contribute, who are they, how much do they cost?"

**Core entities:**
- **Person**: name, email, cost_rate_usd, skill_tags (comma-separated or link to skill_id), start_date, end_date (if terminated)
- **Project**: name, budget_usd, start_date, end_date, bill_rate_usd (default; can override per assignment)
- **Assignment**: person_id, project_id, start_date, end_date, estimated_hours_per_week (or %)
- **Timesheet**: person_id, project_id, week_ending, hours_logged, approved_y/n

**Minimal flows:**
1. **Allocate**: Add assignment (person + project + dates + hours/week) → system computes cost = hours × cost_rate; shows weekly heatmap (% allocation/person; color if >100%).
2. **Track**: Log weekly hours per project → sum to utilization %; flag if unapproved >5 days old.
3. **Report**: Cost report = sum(hours × cost_rate) per project; Margin = Revenue − Cost; Utilization = billed_hours / (40 × weeks available).

**Storage/calc:**
- Store cost_rate, bill_rate, hours_logged with period_date (weekly key); never denormalize—always pull latest effective rate for lookups.
- Margin flagged if <5% or negative; over-allocation highlighted in scheduling view.
- No complex approval flow, no role-based access control (assume 1 team, 1 finance person, 1 PM)—add later if org scales.

**Why this works:**
Simple enough to implement in 4 weeks (schema + REST API + heatmap view). Answers the core question: Is this person over/under capacity, and what does the project cost? Everything else is a feature add.

---

## Sources

- [Float Capacity Planning and Resource Scheduling](https://support.float.com/en/articles/13847946-capacity-planning-and-resource-scheduling)
- [Float Rates and Cost Management](https://support.float.com/en/articles/9100532-rates)
- [Runn Capacity Planning Software](https://www.runn.io/capacity-planning-software)
- [Runn Skills Taxonomy Guide](https://www.runn.io/blog/skills-taxonomy)
- [Runn Utilization Rate Guide](https://www.runn.io/blog/utilization-rate)
- [Resource Guru Booking States and Clash Management](https://help.resourceguruapp.com/en/articles/2942065-creating-bookings)
- [Resource Guru Tentative Bookings](https://help.resourceguruapp.com/en/articles/5415523-creating-tentative-bookings)
- [Kantata Resource Requests Overview](https://knowledge.kantata.com/hc/en-us/articles/4581548561179-Resource-Requests-Overview)
- [Kantata Project Status and RAG Reporting](https://knowledge.kantata.com/hc/en-us/articles/33043130987931-Project-Status-Report-Agent-Overview)
- [OpenAir NetSuite PSA Platform](https://www.openair.com/)
- [SCIM Provisioning with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/architecture/sync-scim)
- [Earned Value Management and EAC Formula](https://www.hellobonsai.com/blog/eac-formula)
