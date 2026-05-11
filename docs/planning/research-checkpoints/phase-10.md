# Phase 10 Checkpoint — Synthesis: themes, scoring, dependency graph, sprint roadmap

**Run date:** 2026-05-10
**Status:** complete; awaiting user validation gate before MASTER_TRACKER append.
**Artifact:** [docs/planning/synthesis-themes.md](../synthesis-themes.md) — 7 sections (theme catalog, per-theme detail, Mermaid graph, impact×effort scatter, sprint roadmap, cross-cutting decisions, new-findings appendix) + coverage matrix.

## Counts

| Metric | Target | Actual |
|---|---|---|
| Themes produced | 18–25 (hard cap 30) | **24** (T-01..T-24) |
| D-items covered | 87 / 87 | **87** (Appendix A coverage matrix) |
| Themes with score + sprint slot + ≥1 acceptance criterion | all | **24/24** |
| Sprint slots occupied | S0..backlog | **6 sprints** (Sprint 0..5 + Backlog) |
| Cross-cutting blockers identified | — | **12** (Section 6) |
| Mermaid graph cycles | 0 | **0** (DAG verified) |
| New D-items minted (D-172+) | 0–3 | **0** (Section 7 documents 3 borderline candidates rejected) |

## Findings summary (≤300 words)

**The 87 findings cluster cleanly into 24 themes** — within the 18–25 target. Most themes (16 of 24) bundle 1–3 D-items; three themes are large (T-08 schema-quality batch = 10 D-items; T-10 customization L1 catalog = 8; T-16 place-person flow = 7). The clustering closely follows the audit-doc boundaries because the audits were already organized by lens; cross-doc bundles (e.g., T-09 mixing Phase 2 D-101 with Phase 3 D-107 with Phase 5 D-128 + D-131) are the meaningful synthesis additions.

**Sprint 0 is 6 themes** (T-07, T-02, T-06, T-01, T-03, T-05) — at the upper bound. This matches Phase 9's Top-10 Blockers shape exactly: D-153 (T-01), D-155 (T-02), D-160 (T-05), D-164 (T-06), D-167 (T-03), D-161 (T-07). T-04 (tenant role customization) was a candidate for P0 but its largest D-item (D-159 admin UI) is DECIDE-tier and the L0→L1 extraction (D-130) is internal hygiene, so it lands in Sprint 2.

**Quick wins identified.** T-07 (locale + timezone, 5–7 days) is the highest-score theme (20) and ships first. T-22 (UI normalization, 2–3 days) is a fast Sprint 3 chore. T-17 (route alias clean-up, 1 day) is a backlog opportunistic pickup.

**12 cross-cutting prerequisites** documented — most critical: T-08 D-110 (FK indexes) gates T-13 D-147 (MVs); T-06 (FxRate) gates T-05 D-160b (fiscal calendar entity); T-01 (`tenantId` everywhere) gates T-03 D-167 (GDPR erasure); T-04 D-130 (extract role-list constants) gates T-04 D-158 (read-endpoint coverage). Mermaid DAG renders cycle-free.

**Zero new D-items minted.** Three candidates (`/admin/platform-settings` UI; tenant date/number formats; ADR backlog hygiene) were considered and rejected as either covered by existing items or being process not findings. If Phase 11 plan-writing surfaces a genuine gap, mint at D-172 then.

## Skills invoked (host-built-in only)

- The spec's `product-management:synthesize-research` and `product-management:roadmap-update` plugin skills are not installed; methodology was inlined.
- Local skills the synthesis drew on:
  - `business-analyst` — for the impact×effort matrix framing and quadrant labels (Quick Wins / Big Bets / Fill-ins / Thankless).
  - `senior-architect` — for the DAG cycle check and the cross-cutting prerequisites enumeration.
  - `tech-debt-tracker` — for the verdict-tag preservation (BLOCKER / SECURITY / SCALE / etc.) per D-item.
  - `concise-planning` — for the ≥1-acceptance-criterion-per-theme rubric.
  - `dependency-management-deps-audit` — adjacent thinking for the prerequisites graph; not strictly applicable since no package dependencies were touched.
- **Subagent dispatch: 0.** The clustering was clean enough that a parallel re-derivation would have added token spend without changing the output. Cross-phase blockers were derived from existing audit-doc text (`scalability-modularity-audit.md:220` confirms D-110 → D-147; `real-org-readiness-gap.md:281` confirms D-96 → D-167) — Bash grep replaced Subagent B.

## Tracker append plan (on user approval)

Append a new sub-heading `### Phase 10 — Synthesis (docs/planning/synthesis-themes.md)` inside the **existing** `## Research Findings (D-85+)` section, immediately after the Phase 9 sub-heading. Body shape:

1. One-paragraph preamble: run date 2026-05-10; 24 themes (T-01..T-24); 87 of 87 D-items covered; 0 new D-ids minted.
2. Theme Index entries (24 lines, one per theme), in score order. Format:
   `- [ ] **T-NN** — [P-tier] Theme name. Bundles D-XX, D-YY, D-ZZ. Effort: N-M days. Sprint: <slot>. — `synthesis-themes.md` §<section>`
3. Trailing line: `_Phase 10 contributed 24 themes (T-01..T-24); 0 new D-items; counter still at D-171._`

The 24 theme-index entries (preview):

| T-id | Tier | Sprint | Title | D-bundle |
|---|---|---|---|---|
| T-07 | P0 | S0 | Locale + timezone + week boundaries | D-161, D-163, D-165 |
| T-11 | P1 | S1 | Outbox producers + DB connection pool | D-142, D-143 |
| T-12 | P1 | S1 | Hot-path query optimization | D-144, D-145, D-146 |
| T-18 | P1 | S1 | Approval-flow + admin gap completion | D-91, D-92, D-93, D-114, D-117 |
| T-20 | P1 | S1 | Dashboard + RBAC data quality fixes | D-115, D-116, D-119, D-120, D-121 |
| T-02 | P0 | S0 | SSO + IdP-driven user lifecycle | D-155, D-156, D-157 |
| T-06 | P0 | S0 | Multi-currency consolidation (FxRate) | D-164 |
| T-10 | P2 | S3 | Customization L1 catalog (config knobs) | D-122..D-127, D-129, D-171 |
| T-16 | P1 | S2 | Place-person flow consolidation | D-85, D-89, D-90, D-98, D-100, D-102, D-118 |
| T-01 | P0 | S0/S1 | Multi-tenant data isolation | D-153, D-154 |
| T-03 | P0 | S0/S1 | GDPR + retention compliance | D-96, D-167, D-168 |
| T-05 | P0 | S0/S2 | Fiscal calendar + period-aware rollups | D-160 |
| T-22 | P2 | S3 | UI normalization (DS regression + decisions) | D-133, D-134, D-135 |
| T-08 | P1 | S1 | Schema-quality batch | D-103, D-104, D-105, D-106, D-108, D-109, D-110, D-111, D-112, D-113 |
| T-09 | P1 | S2 | Lookups → MetadataDictionary | D-101, D-107, D-128, D-131, D-132 |
| T-14 | P2 | S4 | BI extracts + webhook integration surface | D-169, D-170 |
| T-21 | P1 | S2 | Nav restructure (6 → 9 groups) | D-136, D-137, D-138, D-139, D-140, D-141 |
| T-04 | P1 | S2 | Tenant role customization (RBAC L0→L1) | D-130, D-158, D-159 |
| T-13 | P1 | S2 | Materialized rollups + caching layer | D-147, D-148, D-149 |
| T-19 | P2 | S3 | Functional duplication clean-up | D-94, D-95, D-97 |
| T-23 | P2 | S4 | Bulk-import + data-ops expansion | D-166 |
| T-17 | P3 | Backlog | Route alias clean-up | D-86, D-87, D-88 |
| T-24 | P3 | Backlog | Org structure depth (real-org seed) | D-162 |
| T-15 | P3 | Backlog | Architecture refactors (god services + cycles) | D-99, D-150, D-151, D-152 |

No D-172+ block; counter stays at D-171.

## Open questions / next-session inputs

- **Sprint-density check.** Sprint 1 currently lists 5 themes (T-11/T-12/T-18/T-20/T-08) plus continuations of T-03 and T-01 — that's 6–7 themes across an unspecified engineer count. If the team is small, T-08 likely slips to S2 since its 10–15 person-day range dominates. Phase 11 should ask for engineer headcount before locking the xlsx roadmap.
- **T-01 / T-03 split posture.** T-01 is genuinely splittable (T-01a notification suite + idempotency + integration; T-01b long-tail of 60 models). The catalog records this as a note rather than two separate themes; Phase 11 may want to mint T-01a/b as separate roadmap rows. Same for T-05 (D-160a quick fix vs D-160b proper FiscalCalendar entity).
- **T-02 D-157 (SCIM 2.0)** — the catalog recommends defer-to-backlog. If Phase 11 hears differently from a stakeholder ("Okta sales conversation needs SCIM"), promote D-157 out of T-02 and into a Sprint 1 placement.
- **HARDEN_BRIEF F6 boundary.** T-01 D-153 covers the 80 unscoped models; HARDEN_BRIEF F6.1-F6.3 covers the 25 scoped ones. Phase 11 should write the xlsx roadmap rows so F6 and T-01 don't double-count effort. Decision: are these two separate workstreams (recommended), or does T-01 absorb F6 (cleaner but materially expands F6's blast radius)?
- **GDPR ADR (T-03 D-167).** The 3-way decision (redact payload / delete row / cryptographic forgetting) is non-trivial and shapes Sprint 0 effort. Recommend the ADR is a Phase 11 artifact, not a Sprint 0 implementation task.
- **Phase 11 scope.** Per the spec, Phase 11 = master plan + `NEXT_ITERATION_PLAN.md` + xlsx roadmap. Inputs from this synthesis: the 24 themes, the score column, the cross-cutting decisions list, the sprint roadmap. Phase 11 should also reconcile with HARDEN_BRIEF (HD-* + WO-* + PM-* + S-* sibling work) so the xlsx is one master plan, not two.

## Exit conditions hit

- ✅ All 87 D-items appear in at least one theme (Appendix A coverage matrix verifies)
- ✅ 18–25 themes produced (24)
- ✅ Each theme has impact×effort score + sprint slot + ≥1 acceptance criterion
- ✅ Mermaid dependency graph renders without cycles (DAG verified)
- ✅ File:line citations preserved (themes inline-cite each bundled D-id with the audit doc reference)
- ✅ Cross-cutting decisions enumerated (12 edges)
- ✅ New findings posture explicit (0; 3 borderline candidates rejected with reason)

**Stop here.** Awaiting validation gate before tracker append.
