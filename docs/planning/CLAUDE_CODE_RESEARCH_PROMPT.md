# DeliveryCentral — Ultimate Next-Iteration Research & Discovery Script

**For Claude Code in VSCode.** This document is a self-contained research & discovery prompt. Paste it as a session-opening message into Claude Code; it will execute a structured 9-phase audit and emit `docs/planning/NEXT_ITERATION_PLAN.md` plus supporting artifacts.

---

## What this produces

After ~6-10 hours of supervised research (split across multiple Claude Code sessions if needed), Claude Code will have produced these artifacts in `docs/planning/`:

| File | Purpose |
|---|---|
| `NEXT_ITERATION_PLAN.md` | The master plan — goal-by-goal current-state → target-state → migration path |
| `flow-audit.md` | Every user flow mapped; duplicates flagged for collapse |
| `functional-duplication-register.md` | Doubled functionality catalog (e.g. create-SR vs create-assignment) |
| `data-quality-audit.md` | DB normalization debt, denormalization tradeoffs, FK integrity, double-truth columns |
| `jtbd-validation-matrix.md` | Per-role JTBD coverage with green/amber/red verdict |
| `customization-debt-register.md` | Hardcoded values that should be tenant-configurable, mapped to layer (Setting / Dictionary / CustomField / Workflow) |
| `ui-normalization-audit.md` | Page-by-page conformance to DS + page grammars; non-conformance flagged |
| `tab-and-nav-audit.md` | Sidebar group + sub-page categorization review |
| `real-org-readiness-gap.md` | What's missing to run an actual 200-person org day-to-day |
| `scalability-modularity-audit.md` | Module boundary violations, perf hotspots, n+1 queries, scaling cliffs |
| `next-iteration-roadmap.xlsx` | Sprint-mapped roadmap with effort estimates (use xlsx skill) |

**The plan covers nine user-stated goals:**

1. Lean the flows (collapse duplicates like Create Staffing Request vs Create Assignment)
2. Deprecate doubled functionality
3. Simplify architecture — DB normalization, data quality controls
4. JTBDs validated for every default role
5. Increase tenant customization (zero-hardcode policy from `HARDEN_WIRING_MAP §14`)
6. Normalize UI
7. Review tab/sidebar categories
8. Improvements + gap resolution + real-organization readiness
9. Enhance scalability and modularity

---

## Skills to invoke (and where to obtain them)

This research prompt is heaviest on **skills** — they encapsulate the right methodology per task. Verify these are installed before starting; if not, install via `/plugin install <plugin>` in Claude Code or the Marketplace UI.

### Built-in / Anthropic skills (usually available in fresh Claude Code installs)

| Skill | Plugin | What you'll use it for in this prompt |
|---|---|---|
| `anthropic-skills:skill-creator` | built-in (anthropic-skills) | If a domain-specific custom skill is needed during research |
| `anthropic-skills:docx` | built-in | If you want a Word version of the final plan |
| `anthropic-skills:xlsx` | built-in | Required — used to author `next-iteration-roadmap.xlsx` |
| `anthropic-skills:pptx` | built-in | Optional — final exec readout slides |
| `anthropic-skills:pdf` | built-in | Optional — archival PDF of plan |
| `anthropic-skills:web-artifacts-builder` | built-in | If you want an interactive HTML dashboard for findings |

### Engineering plugin skills

Install with `/plugin install engineering` if missing.

| Skill | What you'll use it for |
|---|---|
| `engineering:architecture` | ADR template; document architectural decisions per goal (DB normalization, modularity) |
| `engineering:code-review` | Reviewing existing patterns for the dedup audit |
| `engineering:tech-debt` | Identify refactor priorities; categorize debt |
| `engineering:system-design` | Propose new system designs (lean flow architectures, scaling) |
| `engineering:debug` | If integration tests fail mid-research |
| `engineering:documentation` | Author each output artifact in a consistent voice |
| `engineering:testing-strategy` | Spec test plans per goal |

### Product Management plugin skills

Install with `/plugin install product-management` if missing.

| Skill | What you'll use it for |
|---|---|
| `product-management:write-spec` | Author PRD-style sections in NEXT_ITERATION_PLAN.md |
| `product-management:synthesize-research` | Consolidate the per-goal findings into prioritized themes |
| `product-management:roadmap-update` | Build the sprint-mapped roadmap |
| `product-management:competitive-brief` | If benchmarking against PSA / resource-mgmt tools (already done in `workforce-ops-benchmark-synthesis.md` — extend if needed) |
| `product-management:product-brainstorming` | Phase-9 open-ended exploration of "what would it take to manage a real organization?" |
| `product-management:metrics-review` | If you need to design KPIs per goal |

### Operations plugin skills

Install with `/plugin install operations` if missing.

| Skill | What you'll use it for |
|---|---|
| `operations:process-optimization` | Phase-1 (flow leaning) — formal process-redesign methodology |
| `operations:process-doc` | Document each leaned flow as an SOP with RACI |
| `operations:risk-assessment` | Per-goal risk register |
| `operations:change-request` | Author a CAB-grade change record for any breaking change in the plan |

### How to verify installation

In Claude Code: open the slash menu (`/`) → look for `/plugin` → `/plugin list` shows installed; `/plugin search <name>` finds available; `/plugin install <name>` installs.

If a skill is in this list but not available: ask the human to install the corresponding plugin and resume.

---

## Subagents to use (and how)

Claude Code's `Task` tool can delegate to specialized subagents. Check what's available with `/agents` or by inspecting `.claude/agents/` in the repo.

| Subagent | When to use |
|---|---|
| `general-purpose` | Default; multi-step research where the workflow is open-ended |
| `Explore` | Read-only, breadth-search across many files (e.g., "find every place X is referenced"). Use it for **Phase 2A flow audit** and **Phase 2B duplication audit** |
| `Plan` | Architecture / design planning when output is a step-by-step implementation strategy |
| `code-reviewer` | If installed via plugin — review code patterns for **Phase 2H scalability audit** |
| `claude-code-guide` | If you need to look up Claude Code / API / SDK capabilities mid-research |

**Custom agents:** check `/tmp/dc/.claude/agents/` (or wherever the repo's project-local agents live). The DeliveryCentral repo may have agents tuned for its own workflow (e.g., a `phase-tracker-agent` that updates MASTER_TRACKER as work lands). Prefer those when relevant.

**To define a new agent for this research:** invoke `anthropic-skills:skill-creator` with a request like "create a skill that audits flow duplication." The skill becomes reusable in future sessions.

**Parallelization rule:** when launching multiple subagents that don't depend on each other (e.g., flow audit + customization audit + UI audit), invoke them **in a single message with multiple `Task` tool uses** so they run concurrently. This cuts wall-clock time in half.

---

## Pre-flight reading (Phase 0 — 30-60 min)

Claude Code MUST read these files (in order) before starting any phase. They establish context.

1. `CLAUDE.md` — repo rules, pitfalls, design system standards, RBAC role manifest reference, established patterns.
2. `docs/planning/MASTER_TRACKER.md` — phase status; what's complete, what's pending, what's blocked.
3. `docs/planning/current-state.md` — narrative description of the live system + open blockers.
4. `docs/planning/canonical-staffing-workflow.md` — the 9-status assignment workflow (critical for Phase 1 flow audit).
5. `HARDEN_BRIEF.md` (in repo root or `docs/planning/`) — the prior hardening plan, 84 D-items, sprint roadmap.
6. `HARDEN_WIRING_MAP.md` — endpoint inventory (319 endpoints), 5 scenarios, 6 design systems, meta-audit.
7. `CLAUDE_CODE_TASKS.md` — the execution backlog (sprints 0–8) referenced for context, NOT to redo.
8. `docs/planning/persona-jtbds.md` — existing JTBD documentation per persona (input for Phase 2D validation).
9. `docs/planning/phase18-page-grammars.md` — UI grammar standard (input for Phase 2F UI normalization).
10. `docs/planning/phase18-route-jtbd-audit.md` — route-to-JTBD mapping (input for Phase 2D + 2G).

**Acceptance for Phase 0:** Claude Code can answer in one paragraph each:
- "What are the 6 design systems and their CI gates?"
- "What's the canonical 9-status assignment state machine?"
- "Which 84 discrepancies are already cataloged?"
- "Which user roles exist and what are their default routes?"
- "Where does the existing brief say flows already deduplicate or remain duplicated?"

If any of these questions can't be answered, re-read.

---

## ⚡ MASTER PROMPT (paste this entire block into Claude Code in VSCode)

```
You are a senior product engineer + product manager. You are researching DeliveryCentral
(NestJS + Prisma + React + MUI v7 + custom CSS variables) to produce a comprehensive
next-iteration plan. You will run for many hours of supervised work; checkpoint frequently
to disk so the user can resume across sessions.

PHASE 0 — Pre-flight reading (do this first, every session)

Read these files in order before any action:
  1. CLAUDE.md
  2. docs/planning/MASTER_TRACKER.md
  3. docs/planning/current-state.md
  4. docs/planning/canonical-staffing-workflow.md
  5. HARDEN_BRIEF.md
  6. HARDEN_WIRING_MAP.md
  7. CLAUDE_CODE_TASKS.md
  8. docs/planning/persona-jtbds.md
  9. docs/planning/phase18-page-grammars.md
 10. docs/planning/phase18-route-jtbd-audit.md

Also check `.claude/agents/` for repo-specific subagents and `/plugin list` for installed
skills. Required skill plugins: engineering, product-management, operations, anthropic-skills.
If any skill is missing, install via `/plugin install <plugin>` before proceeding.

Save your progress in docs/planning/research-checkpoints/<phase>.md after each phase so
the next session can resume.

PHASE 1 — Flow audit (lean the flows)

Use the Explore subagent to grep + map every user flow. For each top-level user goal
(e.g. "staff a project", "report time", "approve a release"), build a sequence diagram of:
  - Entry points (FE routes/buttons)
  - Endpoints called
  - Services + state changes
  - Possible alternative entry points for the SAME goal

Output: docs/planning/flow-audit.md with:
  - One section per goal
  - Mermaid sequence diagram per flow
  - **Duplicates section** at the bottom listing every case where >1 entry point reaches
    the same outcome (the user's primary example: Create Staffing Request vs Create
    Assignment for the goal "place a person on a project")
  - For each duplicate: recommend KEEP / DEPRECATE / MERGE with rationale

Use these skills:
  - operations:process-optimization (formal process redesign methodology)
  - operations:process-doc (document each leaned flow as an SOP with RACI)
  - engineering:system-design (when the merged flow needs new architecture)

Acceptance for Phase 1:
  - At least 15 flows mapped
  - At least 5 duplicates identified
  - Each duplicate has a KEEP/DEPRECATE/MERGE verdict with one-paragraph rationale

PHASE 2 — Functional duplication register (deprecate doubled functionality)

Beyond user flows, find UI surfaces / API endpoints / services that do the same thing
in two ways. Examples to seed the search:
  - Person.skillsets[] (legacy) vs PersonSkill[] (canonical) — already in HARDEN_BRIEF D-08
  - Project.tags[] / Project.techStack[] (legacy) vs ProjectTag / ProjectTechnology
  - StaffingRequest.status (cached) vs DeriveStaffingRequestStatusService (computed)
  - Legacy assignment endpoints (approve/reject/end/revoke/activate) vs canonical 9
  - Cmd+K palette vs sidebar vs breadcrumbs — three navigation paths
  - Multiple "Workload" surfaces: /workload, /workload/planning, /staffing-board, /staffing-desk
  - Multiple "Dashboard" surfaces: 8 role-specific dashboards plus Workload Overview
  - admin sub-pages: /admin/dictionaries vs /admin/metadata vs /metadata-admin

Output: docs/planning/functional-duplication-register.md with:
  - Table: Concept | Path A | Path B | Source-of-truth recommendation | Migration cost (S/M/L)
  - Per recommendation: which one wins, why, and the path to deprecate the other

Use:
  - engineering:tech-debt (categorize debt; prioritize by impact × effort)
  - engineering:code-review (verify the duplication is actually parallel, not subtly different)

PHASE 3 — Data quality audit (simplify architecture)

Run a structured audit of prisma/schema.prisma + repository implementations:
  a. Audit-column coverage (createdAt/updatedAt/version/archivedAt/deletedAt/publicId/tenantId/createdById/updatedById) — produce a coverage matrix per model
  b. Enum vs MetadataDictionary classification (per HARDEN_WIRING_MAP §13.1 C decision rule)
  c. FK action policy (Cascade vs Restrict vs SetNull) audit per relation
  d. Index audit — every FK indexed? Common filter pairs covered? Partial indexes on archivedAt?
  e. Postgres CHECK constraints (none today per HARDEN_WIRING_MAP §15.1)
  f. Effective-dating coverage (PersonCostRate, ReportingLine, RateCard — uniform pattern?)
  g. Soft-delete vs hard-delete consistency
  h. Naming conventions (camelCase, *At for timestamps, *On for dates, *Id for FKs)
  i. Double-truth columns (Person.skillsets, Project.tags/techStack)
  j. Computed-vs-cached column drift risk (StaffingRequest.status)

Output: docs/planning/data-quality-audit.md with:
  - Coverage matrices
  - Per-model recommendation: KEEP / NORMALIZE / SPLIT / MERGE
  - Migration sequence (expand → migrate → contract per DM playbook)
  - Postgres CHECK constraints to add (with SQL ready to run)

Use:
  - engineering:architecture (ADRs for any structural decision)
  - engineering:tech-debt

PHASE 4 — JTBD validation per default role

For each default role (admin, director, hr_manager, resource_manager, project_manager,
delivery_manager, employee, plus dual-role RM+HR), validate:
  - The role's stated JTBDs in docs/planning/persona-jtbds.md still match what the
    role can actually accomplish on the live stage
  - The role's dashboard surfaces the right KPIs/queues
  - The role's RBAC permissions allow the JTBDs to complete end-to-end without role-borrowing
  - The role's day-1 onboarding tour (DOC-03 in HARDEN_BRIEF Sprint 4.5) covers the JTBDs

For each role you must:
  1. Login as that role (admin first to validate the framework, then iterate)
     credentials per CLAUDE.md §10
  2. Walk the role's primary 5 JTBDs end-to-end on https://deliverit-test.agentic.uz
  3. Take screenshots; note any blocking gap
  4. Score each JTBD:
       GREEN  — completable in ≤3 clicks, no missing data
       AMBER  — completable but >3 clicks OR missing context
       RED    — blocked (missing endpoint / missing UI / missing role permission)

Output: docs/planning/jtbd-validation-matrix.md with:
  - Matrix: role × JTBD → verdict
  - For every AMBER/RED: closing recommendation (link to existing tasks in
    CLAUDE_CODE_TASKS.md if covered; else propose a new one)
  - Visual: persona journey map per role

Use:
  - product-management:synthesize-research (consolidate raw walk findings into themes)
  - product-management:write-spec (when a JTBD gap requires a new feature spec)

PHASE 5 — Customization debt audit (zero-hardcode policy)

Build on HARDEN_WIRING_MAP §14 (the four-layer customization model: Setting / Dictionary
/ CustomField / Workflow). For every hardcoded value in src/modules/ and frontend/src/,
classify:
  - L0 (legitimately hardcoded — e.g. cryptographic constants)
  - L1 (should be PlatformSetting)
  - L2 (should be MetadataDictionary)
  - L3 (should be CustomFieldDefinition)
  - L4 (should be WorkflowDefinition)

Specific scans (use grep + ast):
  - magic numbers in *.service.ts (e.g., project-risk.service.ts returns 7/14/30/90)
  - hardcoded role strings (1,041 occurrences — already known per HARDEN_WIRING_MAP §12.1)
  - hardcoded enum-to-label maps in frontend/src/lib/labels.ts (138 lines)
  - hardcoded radiator-scorer thresholds in radiator-scorers.ts
  - hardcoded skill categories in CreateEmployeeForm
  - hardcoded notification recipient lists in services
  - hardcoded grade dictionary (G7-G15)
  - hardcoded checklist templates (onboarding, offboarding, project-closure)
  - hardcoded SLA budgets, slate min/max, director-approval thresholds

Output: docs/planning/customization-debt-register.md with:
  - Per file: list of hardcoded values + classification + proposed setting/dictionary key
  - Migration order (cheap wins first)
  - PlatformSetting catalog additions (extends HARDEN_BRIEF Appendix B)

Use:
  - engineering:code-review (sample-grep for additional candidates)
  - product-management:write-spec (when a custom-fields surface needs a UI spec)

PHASE 6 — UI normalization audit

Walk every page (53 routes per HARDEN_WIRING_MAP §3) and audit conformance to:
  - The 8 page grammars in docs/planning/phase18-page-grammars.md
  - DS atoms / molecules / surfaces (DS-1 through DS-7 per MASTER_TRACKER Phase DS)
  - DS conformance baseline scripts/ds-conformance-baseline.json
  - Color tokens (no raw hex outside design-tokens.ts)
  - Common primitives (DataTable, StatusBadge, SectionCard, WorkflowStages, PersonSelect, ConfirmDialog)
  - UX laws (≤3 clicks, no dead-ends, action-data adjacency, filter URL persistence, KPI drilldowns)

For each page output:
  - Grammar conformance: full / partial / missing
  - DS atom usage: percentage of buttons, links, inputs using DS atoms vs raw HTML
  - UX law violations
  - Subtitle correctness, breadcrumb correctness, page-title correctness (D-27/D-28)

Output: docs/planning/ui-normalization-audit.md with:
  - Page × conformance matrix
  - Top 20 normalization wins (highest impact × lowest effort)
  - Recommendations to extend the 8 page grammars if a new pattern emerges

Use:
  - engineering:code-review
  - Explore subagent for breadth-search

PHASE 7 — Tab / sidebar category review

Today's sidebar groups (per route-manifest.ts):
  MY WORK / DASHBOARDS / PEOPLE & ORG / WORK / GOVERNANCE / ADMIN

Audit:
  - Every route's category assignment — does it belong where it lives?
  - Top-level groups — should there be a SUPPLY & DEMAND group separate from WORK?
    Should ADMIN split into ADMIN / SETTINGS / INTEGRATIONS?
  - Per role, which routes are visible vs hidden — does the visible set match the role's daily work?
  - Cmd+K palette (DOC-23) — does it reflect the same categories?
  - Empty / underused groups (e.g., GOVERNANCE has only 2 entries — Exceptions, Integrations —
    which doesn't feel like governance)

Output: docs/planning/tab-and-nav-audit.md with:
  - Current category tree
  - Proposed category tree (with rationale)
  - Per-role visibility table
  - Cmd+K palette tier organization recommendation

Use:
  - product-management:synthesize-research
  - operations:process-doc (document the new category convention)

PHASE 8 — Scalability and modularity audit

Audit the codebase for:
  a. Module boundary violations (per dependency-cruiser config; Phase 20c-01 says workload
     query service crosses 5 modules' repos)
  b. n+1 query risks (especially in dashboard query services that read 6+ aggregates)
  c. Unbounded findMany calls (Phase 20c-12)
  d. forwardRef circular deps (4 modules per Phase 20c-08)
  e. God components / god services (PM/Director/HR dashboard pages 400-441 lines per Phase 20c-15)
  f. Memory hot paths (radiator scoring with 60s cache; planner heatmap 200×26 grid)
  g. Outbox publisher reliability and backlog risk
  h. Materialized view candidates (utilization rollup is one already proposed)
  i. CDN-able vs server-rendered split
  j. Database connection pool sizing vs concurrent request pattern
  k. Large-tenant scaling: at 5000 people / 200 active projects / 1y of timesheets,
     which queries break?

Output: docs/planning/scalability-modularity-audit.md with:
  - Module dependency graph (Mermaid)
  - Top 20 perf hotspots ranked by P95 latency × frequency
  - Scaling cliff projections (at what tenant size does each cliff hit?)
  - Modularity refactor recommendations

Use:
  - engineering:system-design (for modularity refactors)
  - engineering:tech-debt
  - code-reviewer subagent (perf focus)

PHASE 9 — Real-organization readiness gap

Open-ended exploration: what's missing for an actual 200-person consultancy to switch off
their existing tools (a mix of Excel, BambooHR, Float, Jira) and run on DeliveryCentral
day-1?

Specifically investigate:
  - Onboarding the first new tenant (J1 single-deployment-per-tenant — what's the runbook?)
  - Day-1 import flows: people from Workday/BambooHR, projects from Jira, time from existing tool
  - Email deliverability + bounce handling (HARDEN_WIRING_MAP §21.4 OM-01)
  - File upload (avatars, attachments) — no spec today (OM-02)
  - i18n (English-only today; OM-04)
  - Data retention / GDPR / per-tenant deletion (OM-07)
  - Backup / DR / RPO / RTO statement (OM-08)
  - Customer support tooling (impersonation audit trail; OM-11)
  - API consumer documentation / partner portal (OM-12)
  - Mobile / responsive design (most pages have no mobile contract)
  - SOC2 / ISO27001 readiness (operations:compliance-tracking skill if installed)
  - Contracts / billing / pricing — does the tool charge customers? Or is it pre-revenue?

Output: docs/planning/real-org-readiness-gap.md with:
  - Section per gap area: current-state / day-1 requirement / Sprint mapping
  - Risk register (operations:risk-assessment skill output)
  - Recommended sequence (which gaps block first-real-customer signup?)

Use:
  - product-management:product-brainstorming (open-ended exploration)
  - operations:risk-assessment
  - operations:compliance-tracking (if installed)
  - engineering:architecture (for any structural decisions like file-upload backend)

PHASE 10 — Synthesis

Cross-cut all 9 audits and produce:
  - Top 30 themes ranked by impact × effort
  - Theme-to-audit mapping (which audit findings feed each theme)
  - Cross-cutting decisions (e.g., "every theme that touches Project must wait on PM-01")
  - Sprint-mapped roadmap

Use:
  - product-management:synthesize-research (THE primary skill for this phase)
  - product-management:roadmap-update

PHASE 11 — Author the master plan

Use product-management:write-spec to author docs/planning/NEXT_ITERATION_PLAN.md.

Mandatory structure:

  # Next-Iteration Plan
  ## Executive summary (1 page)
  ## Goal 1 — Lean the flows
    - Current state (1 paragraph)
    - Target state (1 paragraph + diagram)
    - Migration path (numbered steps)
    - Acceptance criteria
    - Sprint mapping
    - Estimated effort (person-days)
    - Risks
  ## Goal 2 — Deprecate doubled functionality
  ## Goal 3 — Simplify architecture
  ## Goal 4 — JTBD coverage per role
  ## Goal 5 — Increase tenant customization
  ## Goal 6 — Normalize UI
  ## Goal 7 — Review tab categories
  ## Goal 8 — Real-organization readiness
  ## Goal 9 — Scalability and modularity
  ## Cross-cutting roadmap
  ## Risk register
  ## Definition of done per goal

Then use anthropic-skills:xlsx to author docs/planning/next-iteration-roadmap.xlsx with:
  - Sheet 1: Tasks (id, goal, sprint, effort, depends_on, owner, status)
  - Sheet 2: Risk register
  - Sheet 3: JTBD matrix
  - Sheet 4: Customization debt
  - Sheet 5: Coverage of HARDEN_BRIEF D-items

Use anthropic-skills:docx to author a shareable Word version if the human asks.

PHASE 12 — Quality gate

Before declaring done, ALL these must be true:

  [ ] All 9 audit artifacts exist in docs/planning/
  [ ] NEXT_ITERATION_PLAN.md covers all 9 user goals with the mandatory structure above
  [ ] Roadmap xlsx has at least 50 tasks, all mapped to sprint and effort
  [ ] Every JTBD scored GREEN/AMBER/RED with closing recommendation
  [ ] At least 5 flow duplicates identified with KEEP/DEPRECATE/MERGE verdicts
  [ ] At least 30 customization debt items registered with layer classification
  [ ] At least 20 UI normalization wins documented
  [ ] Postgres CHECK constraint SQL ready-to-run for at least 5 invariants
  [ ] Module dependency graph rendered as Mermaid in scalability audit
  [ ] Risk register has at least 15 entries
  [ ] Every recommendation cites the source audit + the closing-task ID

If any acceptance criterion fails, return to the relevant phase and continue.

OPERATING RULES

  - Save checkpoints every 30 minutes to docs/planning/research-checkpoints/<phase>.md
    so a session can resume mid-stream.
  - Never commit to main; all artifacts go in feature branches.
  - When you discover a finding that overlaps with an existing HARDEN_BRIEF D-item,
    cite the D-id rather than re-discovering it. Add D-IDs only for genuinely new findings
    (continue numbering from D-85 onward).
  - Use the Explore subagent for read-only breadth searches; use the Plan subagent for
    architecture decisions; use general-purpose for everything else.
  - Parallelize subagents in a single message when their work is independent.
  - When a skill applies, INVOKE the skill via the Skill tool. Do not paraphrase the
    skill's methodology from memory.
  - When a finding requires walking the live stage, request human credentials in chat
    and walk via Chrome MCP tools. Capture screenshots in docs/planning/research-screenshots/.
  - When unsure of scope, ASK the human via AskUserQuestion before proceeding.
  - The Definition of Done from CLAUDE_CODE_TASKS.md (Universal Preamble) applies to
    every PR opened during this research.

ESCAPE HATCHES

  - If a phase blows past 4 hours, STOP and surface what you have. Don't run infinite.
  - If verify:pr is broken when you start, fix that first (it's HARDEN_BRIEF Sprint 0
    task 0.1 — the DI fix); do not write more research on a broken backend.
  - If a skill is missing, ask the human to install via /plugin install before proceeding.

Now begin Phase 0.
```

---

## Execution playbook (for the human running Claude Code)

### Setup (one-time)

```bash
# 1. Open the repo in VSCode
code ~/path/to/DeliveryCentral

# 2. Open Claude Code (Cmd+Shift+P → "Claude Code")

# 3. Verify required plugins installed
/plugin list

# 4. Install missing plugins (skip those already present)
/plugin install engineering
/plugin install product-management
/plugin install operations

# 5. Verify subagents
/agents

# 6. Pull latest hardening artifacts
git pull origin main
ls docs/planning/  # confirm HARDEN_BRIEF.md, HARDEN_WIRING_MAP.md, CLAUDE_CODE_TASKS.md exist
```

### Run the research (multi-session)

Paste the **MASTER PROMPT** above into Claude Code as the session-opening message.

| Session | Phases | Wall-clock |
|---|---|---|
| Session 1 | Phase 0 (read) + Phase 1 (flow audit) | 1.5–2 h |
| Session 2 | Phase 2 (functional dup) + Phase 3 (data quality) | 2 h |
| Session 3 | Phase 4 (JTBD validation) — requires live walks | 2–3 h |
| Session 4 | Phase 5 (customization) + Phase 6 (UI) | 2 h |
| Session 5 | Phase 7 (tabs) + Phase 8 (scalability) | 1.5 h |
| Session 6 | Phase 9 (real-org gap) | 1.5 h |
| Session 7 | Phase 10 (synthesis) + Phase 11 (master plan) | 2 h |
| Session 8 | Phase 12 (QA) + final review | 1 h |

**Resume between sessions:** at session start, paste the MASTER PROMPT again. Claude Code reads `docs/planning/research-checkpoints/` and resumes from the last completed phase.

### When Claude Code asks for input

- **Live stage credentials** — provide them when Phase 4 requests them (Chrome MCP requires manual login).
- **Plugin install permission** — agree if a missing skill is needed.
- **Scope clarification** — answer concisely; the agent will resume.
- **"Skip benchmark? Already done in workforce-ops-benchmark-synthesis.md"** — say "skip" unless you want a refresh.

### When to stop and review

After each session, skim `docs/planning/research-checkpoints/<phase>.md` and the artifact for that phase. Reject findings that are:
- Wrong (cite the file/line proving it)
- Out-of-scope (not in the 9 stated goals)
- Already-decided (in HARDEN_BRIEF; cite which D-item)

Adjust the MASTER PROMPT in the next session with corrections.

---

## Output specification — what `NEXT_ITERATION_PLAN.md` must contain

The plan must follow this structure exactly. Each goal section must answer:

```
## Goal N — <name>

### Current state (≤200 words)
- What exists today, anchored to file paths or D-IDs

### Target state (≤200 words + 1 diagram)
- The desired end-state, with a mermaid diagram if architectural

### Migration path (numbered steps, executable)
1. ...
2. ...

### Acceptance criteria
- [ ] ...
- [ ] ...

### Sprint mapping
- Sprint X: tasks A, B, C
- Sprint Y: tasks D, E

### Estimated effort
- Person-days per task (S = 1-2d, M = 3-5d, L = 1-2 weeks, XL = 2+ weeks)

### Risks (table)
| Risk | Likelihood | Impact | Mitigation |

### Dependencies on other goals
- Goal X must land before Goal Y can ...
```

The roadmap xlsx must contain a master Tasks sheet (one row per task) with columns:
`id | goal | sprint | effort | depends_on | owner_role | status | acceptance_summary | source_audit`.

---

## Custom agent uses (advanced)

If your team has a richer agent ecosystem, here are agents to spin up DURING the research:

| Agent role | Purpose | How to set up |
|---|---|---|
| `flow-auditor` | Phase 1 specialist; understands process-optimization deeply | Use `anthropic-skills:skill-creator` to create a `.claude/agents/flow-auditor.md` with system prompt = "You are an expert in BPMN modeling and PSA workflows. Map every flow to a Mermaid sequence; propose merges using operations:process-optimization." |
| `data-archaeologist` | Phase 3 specialist; lives in prisma/schema.prisma + migration history | Same. System prompt: "You are a database design expert. Your job: audit Prisma schemas for normalization debt, double-truth columns, missing indexes/constraints, and effective-dating gaps. Output goes through engineering:architecture skill." |
| `jtbd-walker` | Phase 4 specialist; walks the live stage as each role | Same. System prompt: "You are a UX researcher. Login as the named role, walk the role's top 5 JTBDs end-to-end on the live stage, score each GREEN/AMBER/RED, capture screenshots." |
| `customization-detective` | Phase 5 specialist; greps for hardcoded values | Same. System prompt: "You hunt hardcoded values. Classify each find as L0-L4 per the four-layer customization model in HARDEN_WIRING_MAP §14." |

Spin them up with `Task({ subagent_type: 'general-purpose', prompt: '<the agent\'s system prompt + assignment>' })` if no `.claude/agents/` definition exists. Or define them as files for reuse.

For the **default Claude Code subagents** (general-purpose, Explore, Plan, code-reviewer):

```
# Use Explore for breadth-search (Phase 1, 2, 5)
Task({
  subagent_type: 'Explore',
  description: 'Find every flow entry point',
  prompt: 'Find every page/component/endpoint that initiates the action "place a person on a project". Report file paths and line numbers. Do not modify anything.'
})

# Use Plan for architecture decisions (Phase 3, 8, 9)
Task({
  subagent_type: 'Plan',
  description: 'DB normalization plan for skills',
  prompt: 'Plan the deprecation of Person.skillsets[] in favor of PersonSkill rows. Output expand→migrate→contract sequence with migration filenames, backfill script, and rollback. Reference HARDEN_BRIEF P-04 for context.'
})

# Use general-purpose for everything else
Task({
  subagent_type: 'general-purpose',
  description: 'Synthesize Phase 9 findings',
  prompt: '...'
})
```

---

## Where each skill comes from

| Skill | Source plugin | Install command |
|---|---|---|
| anthropic-skills:* | built-in (anthropic-skills) | usually pre-installed |
| engineering:* | engineering plugin | `/plugin install engineering` |
| product-management:* | product-management plugin | `/plugin install product-management` |
| operations:* | operations plugin | `/plugin install operations` |
| productivity:* | productivity plugin | `/plugin install productivity` (optional) |
| cowork-plugin-management:* | cowork plugin | usually pre-installed if running in Cowork mode |

If a plugin search returns nothing: the skill may live in the org's private marketplace; ask your admin. Or use `anthropic-skills:skill-creator` to author the methodology yourself.

---

## Failure modes & recovery

| Failure | Recovery |
|---|---|
| Backend won't start (DI failure D-02) | Fix HARDEN_BRIEF Sprint 0 task 0.1 first; do NOT do research on a broken backend |
| Live stage rejects login | Use admin@delivery.local creds per CLAUDE.md §10; if those fail, ask the human; do NOT brute-force |
| `verify:pr` fails when you start | Fix the failure first; CLAUDE.md rule — never bypass with `--no-verify` |
| Subagent runs >30 minutes | Kill it; reduce scope; restart |
| Plugin install fails | Ask the human to install manually via Marketplace UI |
| Out of context window mid-research | Save checkpoint; ask human to start a new session; resume by re-pasting MASTER PROMPT |
| Discovered a brand-new D-item | Add to docs/planning/D85-onward.md (not HARDEN_BRIEF); cross-link to relevant audit |
| Stuck on a phase >4h | Surface what you have; stop |
| Live walk surfaces a new bug not in the 9 goals | Note in docs/planning/research-checkpoints/incidental-findings.md; do not pivot |

---

## Definition of Done — for the research itself

- [ ] All 9 goal-specific audit files exist and pass their per-phase acceptance criteria
- [ ] `NEXT_ITERATION_PLAN.md` exists with the mandatory structure
- [ ] `next-iteration-roadmap.xlsx` exists with at least 50 tasks
- [ ] Every recommendation cites a source audit OR an existing HARDEN_BRIEF D-item
- [ ] Every JTBD has a GREEN/AMBER/RED verdict
- [ ] At least 30 customization debt items registered
- [ ] At least 5 flow duplicates classified KEEP/DEPRECATE/MERGE
- [ ] No empty sections; every section has substantive content
- [ ] Final readout (Phase 12) checked: nothing wrong, nothing missing
- [ ] CHANGELOG.md mentions the research artifacts under "Research" heading

---

## Companion files (already in repo)

These are referenced throughout. The research script must NOT recreate them; only extend.

| File | Authoritative for |
|---|---|
| `HARDEN_BRIEF.md` | The 84 D-items, hardening sprint 0–8 plan |
| `HARDEN_WIRING_MAP.md` | 319 endpoints, 5 scenarios, 6 design systems, meta-audit |
| `CLAUDE_CODE_TASKS.md` | Sprint-ordered execution backlog |
| `workforce-ops-benchmark-synthesis.md` | Float / Runn / Kantata patterns |
| `docs/planning/MASTER_TRACKER.md` | Phase status; the read-only ledger |
| `docs/planning/current-state.md` | Live system narrative + open blockers |
| `docs/planning/canonical-staffing-workflow.md` | The 9-status workflow |
| `docs/planning/persona-jtbds.md` | JTBDs per persona |
| `docs/planning/phase18-page-grammars.md` | The 8 page grammars |
| `docs/planning/phase18-route-jtbd-audit.md` | Route-to-JTBD mapping |
| `frontend/src/styles/design-tokens.ts` | UI DS source of truth |
| `frontend/src/app/route-manifest.ts` | Centralized route + role map |

---

## Quick-start (TL;DR)

1. Verify plugins: `/plugin install engineering product-management operations`
2. Open VSCode + Claude Code in the DeliveryCentral repo
3. Pull latest: `git pull origin main`
4. Paste the **MASTER PROMPT** (block above) into Claude Code as session-opening message
5. Provide live-stage creds when Phase 4 requests them
6. After 6–10 hours of supervised work across multiple sessions, `docs/planning/NEXT_ITERATION_PLAN.md` exists
7. Review with the team; convert plan → executable sprint backlog (extend `CLAUDE_CODE_TASKS.md` Sprint 9+)

---

## Why this design

**Bounded:** every phase has a time cap and an acceptance gate. Claude Code won't run infinite.

**Skill-driven:** instead of "agent does it from memory," the prompt INVOKES skills. Skills carry methodology that survives between sessions.

**Resumable:** checkpoints to disk every 30 min. Mid-stream sessions safe.

**Output-shaped:** the deliverable structure is in the prompt itself. Claude Code can't drift into a different shape.

**Cited:** every recommendation links to source audit OR existing D-item. No floating opinions.

**Honest:** §Failure modes + §Escape hatches name when to stop. The plan accepts its own incompleteness as a feature (per HARDEN_WIRING_MAP §18).

**Composable:** built on top of HARDEN_BRIEF + HARDEN_WIRING_MAP + CLAUDE_CODE_TASKS — extends them; doesn't replace them.

That's the contract. Hand the MASTER PROMPT to Claude Code in VSCode and let it run.

— end —
