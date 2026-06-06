# V2 C0 Checklist — 22 gate items

**Purpose:** single ledger of the 22 gates that must all be green before
`CUTOVER_RUNBOOK.md` is executed. 10 technical + 12 user-visible.

**Authority to flip:** Director-of-Engineering sign-off on **every** row
below being `[x]`. A `[-]` (deferred) row blocks the flip unless the
deferral was approved by Director-of-Engineering and recorded inline.

**Sources:**
- Master plan: `/home/drukker/.claude/plans/v2-master-plan-2026-06-02.md`
  (gates 1–12).
- Per-persona JTBDs: section "What this delivers per persona".
- Runbook: `docs/runbooks/CUTOVER_RUNBOOK.md`.

---

## Technical gates (10)

These come straight from the master plan's "Technical gates (must all
be green)" list. Each item names the closing PR or work-item ID for
auditability.

| # | Gate | Status | Closing PR / work item | Verification |
|---|---|---|---|---|
| T-1 | **Schema cleanup complete.** `V2-H.14-LEGACY-DROP` shipped: ProjectAssignment, StaffingRequest, StaffingRequestProposalSlate, StaffingRequestProposalCandidate, StaffingRequestFulfilment tables + 5 enums dropped. | `[ ]` | `V2-H.14-LEGACY-DROP` | `prisma migrate deploy` succeeds first try on fresh DB; `/api/health/deep` = `"ready"`. |
| T-2 | **Callsite cleanliness.** | `[ ]` | `LEAN-P2-9`, `V2-H.14-LEGACY-DROP` | `grep -rn 'prisma\.projectAssignment\|prisma\.staffingRequest' src/` returns 0; `grep -rn 'from @/lib/api/assignments\|from @/lib/api/staffing-requests' frontend/src/` returns 0. |
| T-3 | **Legacy code deletion shipped.** | `[ ]` | `V2-H.14-LEGACY-DROP` + `LEAN-P3-2` | Backend: `AssignmentsModule`, `StaffingRequestsModule`, `InMemoryStaffingRequestService`, `ProjectPositionMirrorService` deleted (or 410-Gone shims documented). Frontend: 8 legacy pages deleted from router; `staffingMakeAssignment`/`staffingBulkAssignment` flags removed. |
| T-4 | **Visual-regression baseline locked.** `V2-PLAYWRIGHT-BASELINE` committed. | `[x]` | **PR #548** | 120 snapshots (30 routes × 2 themes × 2 flag states). Shadow CI blocks any PR with >3% pixel delta. |
| T-5 | **Accessibility baseline green.** `AXE-A11Y-BASELINE` complete. | `[x]` | **PR #549** | 8 DS atoms WCAG-AA across light+dark; exceptions documented with justification. |
| T-6 | **Audit-trail coverage ≥98%.** `D-103-ROUND-38` complete. | `[ ]` | `D-103-ROUND-38` | `SELECT COUNT(*) FROM AuditLog WHERE actorId IS NULL AND createdAt > NOW() - INTERVAL '7 days'` returns 0 for mutations. |
| T-7 | **Tenancy verified.** `TENANCY-AUDIT-3-AGGREGATORS` shipped. | `[x]` | **PR #551** | `DirectorAnomalyDetectionService`, `PortfolioFinanceSummaryService`, `SuggestFillsService` either tenant-filtered or single-tenant assumption documented in `docs/planning/tenancy-assumptions.md`. |
| T-8 | **Bundle within budget.** `BUNDLE-SIZE-GATE` enforces ≤ +15% gzipped delta vs 2026-05-01 baseline. | `[x]` | **PR #550** | Last 5 main pushes show `bundle-size-gate` green. |
| T-9 | **Rollback proven.** `ROLLBACK-DRILL` complete. | `[ ]` | `ROLLBACK-DRILL` (Wave C) | 5 of 5 v2-staging revert drills measured ≤30s to `/api/health/deep` = `"ready"`. Log: `docs/testing/c0-acceptance/rollback-drill-log.md`. |
| T-10 | **Soak passed.** `V2-SOAK-STAGING` complete. | `[ ]` | `V2-SOAK-STAGING` | ≥1 calendar week dsRefresh=100% on staging under bank-like load (50+ concurrent users); zero P0/P1; <5% error rate; p95 latency ≤ baseline + 20%; zero notification drops. |

---

## User-visible gates (12)

The master plan defines two roll-up gates (11 click-through and 12
per-persona matrix). Below they are broken into the **5 cross-cutting
acceptance gates** and the **7 per-persona ability-matrix gates** that
make up gate 12.

### Cross-cutting acceptance (5)

| # | Gate | Status | Closing PR / work item | Verification |
|---|---|---|---|---|
| U-1 | **`MANUAL-CLICK-THROUGH-30-JOURNEYS` executed.** 30 journeys × 8 seed accounts = 256 flows on v2-staging. | `[ ]` | `MANUAL-CLICK-THROUGH-30-JOURNEYS` (Wave C) | Zero console errors; zero P0/P1 findings. Screenshot bundle committed under `docs/testing/c0-acceptance/`. |
| U-2 | **`CUTOVER_RUNBOOK.md` reviewed + signed.** Director-of-Engineering + delivery-ops + primary on-call SRE have signed off in writing. | `[ ]` | This PR | Signatures + dates inline at the bottom of this file. |
| U-3 | **142-item manual test plan smoke-ready.** | `[ ]` | `docs/testing/MANUAL_TEST_PLAN.md` | Test owner named; test plan revision matches latest seed; assigned 4h block at T+24h post-flip. |
| U-4 | **Bank-side change-management notified ≥24h ahead.** | `[ ]` | Change ticket | Ticket number recorded inline; flip window confirmed; rollback rights confirmed. |
| U-5 | **v2-staging at dsRefresh=100% for ≥7 days.** | `[ ]` | `V2-SOAK-STAGING` | Verified via `updatedAt` on `PlatformSetting.flag.dsRefresh.enabled` row on staging. |

### Per-persona ability matrix (7)

Each persona must complete their top-5 JTBDs end-to-end on v2 chrome
without falling back to legacy paths. Detailed JTBD list per persona is
in the master plan "What this delivers per persona" section.

| # | Persona | Status | Top-5 JTBDs all green? | Sign-off |
|---|---|---|---|---|
| P-1 | **Project Manager** | `[ ]` | Approve from `/approvals`; project detail "why 14 days?" drill; Onboarding-stage gate; bulk team reassignment; time-to-fill KPI. | `<PM lead name + date>` |
| P-2 | **Resource Manager** | `[ ]` | Save/load/compare planner scenarios; cross-position candidate queue; auto-populated skill-ranked slate; consolidated Staffing Desk; `/approvals` in-context. | `<RM lead name + date>` |
| P-3 | **HR Manager** | `[ ]` | Approve leave from `/approvals`; skill endorsement workflows; bulk org-unit reassignment; redesigned `/cases` with inspector; People directory filter persistence. | `<HR lead name + date>` |
| P-4 | **Director** | `[ ]` | Finance-anomaly → position drill; what-if CPI/budget; bench aging by skill/unit; org-health metrics; `/projects` FilterBar persistence. | `<Director sign-off name + date>` |
| P-5 | **Delivery Manager** | `[ ]` | Team-wide conflicts view; DM escalation approval path; `hasOpenGaps`/`closingInDays` filter; `/reports` sub-page Tabs; real-time fill status. | `<DM lead name + date>` |
| P-6 | **Employee** | `[ ]` | Submit timesheet from `/me?tab=time`; submit leave; cancel pending leave or preview impact; self-endorse skills; receive leave notifications. | `<Employee QA lead name + date>` |
| P-7 | **Admin** | `[ ]` | Configure SSO from `/admin/settings`; define custom roles; manage feature flags via UI; triage failed integrations with Retry/Reset/Test; configure leave policies. | `<Admin lead name + date>` |

---

## Sign-off block — fill at T+2h post-flip

> Do **not** sign this block until the runbook's Step 7 verification has
> reported all four pass-criteria green and the T+2h status block has
> been posted to the incident channel.

```
C0 Flip Sign-off
================
Flip date (UTC):           ______________________________
Flipper name (SRE):        ______________________________
Director-of-Engineering:   ______________________________
Delivery-ops sign-off:     ______________________________
Total elapsed (T+0 → 100%): ______________________________
Rollbacks during flip:     ______________________________
Open c0-cutover tickets:   ______________________________
Post-flip smoke owner:     ______________________________
Smoke completion target:   ______________________________
```

---

## Reference

- **Runbook:** `docs/runbooks/CUTOVER_RUNBOOK.md`
- **Quick reference:** `docs/runbooks/CUTOVER_RUNBOOK_QUICKREF.md`
- **Status template:** `docs/runbooks/cutover-status-template.md`
- **Master plan:** `/home/drukker/.claude/plans/v2-master-plan-2026-06-02.md`
- **Manual test plan:** `docs/testing/MANUAL_TEST_PLAN.md`
- **Memory note:** `feedback-v2-build-fully-before-cutover`

## Change log

| Date | Author | Change |
|---|---|---|
| 2026-06-06 | Wave-C agent | Initial ledger created. T-4 / T-5 / T-7 / T-8 marked green from PRs #548 / #549 / #551 / #550. All other rows opened with `[ ]`. |
