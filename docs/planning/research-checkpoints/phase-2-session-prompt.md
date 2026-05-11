# Session-Opening Prompt — Phase 2 (Functional Duplication Register)

**How to use:** open Claude Code at the repo root and paste the block below as the session-opening message. The agent will resume mid-stream from the Phase 1 artifacts already on disk.

---

```
You are continuing a multi-session research effort against the DeliveryCentral
repo at /home/drukker/DeliveryCentral. The driving spec is at
docs/planning/CLAUDE_CODE_RESEARCH_PROMPT.md (12 phases, ~6-10 h, 11 audit
artifacts + 1 xlsx roadmap).

This session = Phase 2 only (Functional duplication register). Phase 0 and
Phase 1 are already done and validated by the user. The approved master plan
lives at /home/drukker/.claude/plans/use-claude-code-research-prompt-md-and-r-fancy-canyon.md
— skim it for context but execute only Phase 2.

OPERATING RULES (USER-CONFIRMED — overrides spec where they disagree)

  - No branch. Write all artifacts directly to docs/planning/ on the current
    branch (`main`). Never run git checkout, git add, git commit, or git push.
  - Per-phase validation gate. After Phase 2's artifact is written, STOP.
    Summarize findings inline (≤300 words). Use AskUserQuestion to ask the
    user to validate. On approval, append D-items to MASTER_TRACKER.md.
  - MASTER_TRACKER.md is append-only. Never reorder, rename, or remove
    existing items (CLAUDE.md §2). Add new items only inside the existing
    `## Research Findings (D-85+)` section at the bottom (Phase 1 contributed
    D-85..D-93; Phase 2 starts at D-94).
  - Skills strategy: use local flat-named substitutes (the spec's
    engineering:*, product-management:*, operations:* plugins are NOT
    installed). For Phase 2 the closest local skills are
    `tech-debt-tracker`, `code-review-excellence`, and
    `codebase-cleanup-tech-debt`. Where no local match exists, inline the
    methodology from the spec rather than skip content. Don't try
    /plugin install — that's an out-of-band human action.
  - Subagents: use host built-ins. Phase 2 is a great fit for the `Explore`
    subagent dispatched in parallel for separate dup areas. The repo has no
    .claude/agents/ — don't try to spawn the spec's `flow-auditor` /
    `data-archaeologist` agents; inline the system prompt instead.

PRE-FLIGHT (≤10 min)

Read these files first to anchor (most are already in earlier checkpoints —
skim, don't deep-read):

  1. CLAUDE.md (repo rules; loaded automatically by the harness anyway)
  2. docs/planning/research-checkpoints/phase-0.md (5 acceptance answers with
     citations; gives you the 6-design-systems framing, the 9-status state
     machine, the 7-roles list, and the dedup-vs-duplicated landscape)
  3. docs/planning/flow-audit.md (Phase 1 output — 15 flows + 8
     multi-path classifications). The flow audit's duplicates section is
     the seed list for Phase 2; extend, don't repeat.
  4. docs/planning/research-checkpoints/phase-1.md (per-phase exit summary)
  5. The bottom of docs/planning/MASTER_TRACKER.md — the new
     `## Research Findings (D-85+)` section. D-85..D-93 already exist; you
     start at D-94.
  6. Quickly grep through docs/planning/HARDEN_BRIEF.md for D-08, D-09,
     D-10, D-11, D-21, D-24 (the seed dup-pairs the spec already identifies).

PHASE 2 — Functional Duplication Register (per spec lines 202-221)

Goal: find UI surfaces / API endpoints / services / Prisma columns that do
the same thing in two ways. Beyond user-flow duplicates (Phase 1 covered
those). Pre-seeded examples to extend:

  - Person.skillsets[] (legacy free-text array) vs PersonSkill[] (canonical
    typed model with proficiency + certified) — D-08 / D-30 / D-46
  - Project.tags[] / Project.techStack[] vs ProjectTag / ProjectTechnology
    join tables — D-10
  - StaffingRequest.status (cached column) vs
    DeriveStaffingRequestStatusService (computed) — D-11
  - Legacy assignment endpoints (/approve /reject /end /revoke /activate)
    vs canonical 9 transition endpoints — D-04 / D-89
  - Cmd+K palette vs sidebar vs breadcrumbs — three navigation paths
  - 4 workload surfaces: /workload, /workload/planning, /staffing-board,
    /staffing-desk
  - 8 dashboard surfaces: /, /dashboard/{employee,project-manager,
    resource-manager,hr,delivery-manager,director,planned-vs-actual},
    /dashboards/portfolio-radiator
  - 3 admin metadata surfaces: /admin/dictionaries, /admin/metadata,
    /metadata-admin
  - "in-memory-*" services that actually use Prisma (D-24)
  - PersonCostRateType enum (only INTERNAL today; no bill rate per project)
    vs the missing rate-card surface — D-09

Find more beyond these. Suggested attack:
  - Dispatch 2-3 Explore subagents IN PARALLEL on different dup categories
    (schema double-truth, API duplicate paths, FE surface duplicates) to
    keep wall-clock down.
  - For each pair found, classify Source-of-truth (which one wins), Cost
    (S/M/L), and Migration path (expand→contract pattern where applicable).

OUTPUT

Author docs/planning/functional-duplication-register.md with:

  - One-paragraph context section (what this register catalogs and why).
  - Table: Concept | Path A | Path B | Source-of-truth recommendation |
    Migration cost (S/M/L) | Closing task ID
  - Per concept, a sub-section with: 1-paragraph rationale citing file:line
    evidence for both paths, 1-paragraph migration plan
    (expand→migrate→contract), and any cross-references to existing tracker
    items (HARDEN_BRIEF D-NN, Phase WO-X, Phase DM-X) so we don't re-spec
    work that's already planned.
  - At the bottom: a "Refuted candidates" subsection for pairs that LOOK
    like duplicates but are actually correct architecture (e.g., legacy
    string columns kept as backwards-compat shims that haven't actually
    landed yet).

Acceptance: ≥10 dup pairs registered, each with SoT recommendation + cost.

CHECKPOINT

Write docs/planning/research-checkpoints/phase-2.md with:
  - Status (complete/partial/blocked)
  - Counts (dup pairs found, by category)
  - Pointer to functional-duplication-register.md
  - Tracker-append plan: a numbered list of D-items to append on user
    approval (start at D-94). Each entry: "D-NN — [VERDICT] short title —
    one-sentence rationale — source file row".
  - Skills invoked + result
  - Open questions / next-session inputs

VALIDATION GATE

Stop after the checkpoint is written. Use AskUserQuestion with options:

  1. Approve — append D-94..D-NN to MASTER_TRACKER and stop session
     (Recommended)
  2. Approve — append D-items AND continue to Phase 3
  3. Approve audit but skip tracker append
  4. Reject — redo something

ON APPROVAL

Append D-items to the EXISTING `## Research Findings (D-85+)` section at
the bottom of MASTER_TRACKER.md (DO NOT create a new top-level section).
Add them under a new sub-heading `### Phase 2 — Functional duplication
(docs/planning/functional-duplication-register.md)`. Same format as the
Phase 1 entries — checkbox + bold D-id + verdict tag + body + source row.

Then stop the session — Phase 3 is its own future session with its own
prompt.

ESCAPE HATCHES

  - If you hit the spec's escape hatch (Phase 4 backend health blocker),
    skip — Phase 2 is static and doesn't need a running backend.
  - If you find a critical bug not in any of the 9 research goals, log it
    in docs/planning/research-checkpoints/incidental-findings.md (create
    if needed) and DO NOT pivot. Continue Phase 2.
  - If your Explore subagents return ambiguous evidence, ask the user to
    disambiguate via AskUserQuestion before classifying SoT.
  - If a "duplicate" you find is actually already on the tracker as a
    pending task (e.g., D-89 covers legacy assignment endpoints), cite the
    existing D-id in the Closing-task column and do NOT mint a new D-id
    — the register cross-references existing work, it doesn't duplicate
    the duplicates.

Now begin.
```

---

## Notes for the operator (Viktor)

- **Estimated wall-clock:** 2-2.5 hours. Mostly Explore-subagent search; the synthesis step is faster than Phase 1's because the structure is tabular.
- **What will land if you approve at the gate:** `docs/planning/functional-duplication-register.md` (~10-15 dup pairs with verdicts), `docs/planning/research-checkpoints/phase-2.md`, and a new `### Phase 2 — Functional duplication` subsection appended under the existing `## Research Findings (D-85+)` section in `MASTER_TRACKER.md`.
- **What stays untouched:** all source code, schema, existing MASTER_TRACKER content above line 2796, CLAUDE.md, HARDEN docs.
- **If a finding overlaps an existing tracker D-id (e.g., D-08 / D-89), the agent will cross-reference rather than mint a new D-id.** This keeps the register honest and prevents tracker bloat.
- **Resume rule:** if the session crashes or context fills, the agent can resume from the checkpoint files. Just paste the same prompt block again.
