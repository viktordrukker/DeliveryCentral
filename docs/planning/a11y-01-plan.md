# A11Y-01 — Accessibility hardening plan

**Status:** Open · planning doc for a future dedicated session
**Source audit item:** `docs/planning/AUDIT_REMEDIATION_TRACKER.md` STAGE 10 → A11Y-01
**Last updated:** 2026-04-27

---

## 1. Goal

Promote DC from "no critical axe violations on 6 dashboards" to "no critical
**or serious** axe violations across the high-traffic surfaces of the app, with
manual screen-reader verification on the top user flows."

The existing baseline already gives us guardrails. This work expands coverage
and fixes the violations that surface when we tighten the gate.

---

## 2. Current state — what's already in place

Don't redo any of this:

- **`@axe-core/playwright` ^4.11.1** is installed and configured (`package.json`).
- **`e2e/tests/14-accessibility.spec.ts`** runs axe on 6 role dashboards
  (`/dashboard/employee` through `/admin`) and the login page. WCAG 2.0 A + AA
  tags, recharts SVGs excluded.
- **Current gate:** fails on `critical` violations only. `serious` are logged as
  warnings.
- **Existing aria-label coverage:** ~99 hits across the codebase already
  (`grep -rn "aria-label=" frontend/src/`).
- **`StatusBadge`** already renders the label text alongside the colored dot for
  the `dot` variant ([StatusBadge.tsx:148-170](frontend/src/components/common/StatusBadge.tsx#L148-L170)),
  so the "color-only conveyance" risk does not apply. `score` variant has
  `aria-label`. No StatusBadge dual-cue work needed.
- **DC's emoji-button pattern is `← Prev` / `Next →`** (text + symbol), not
  symbol-only. A grep for symbol-only buttons returned zero hits. So the
  "icon-only button" risk is much smaller than the audit text suggested.
- **Form inputs** are mostly wrapped in `<label className="field"><span class="field__label">…</span><input/></label>`,
  which is implicit-association accessible. The 68 raw `<input>` + 27
  `<select>` in the codebase are mostly inside this wrapper.

---

## 3. Real remaining work

Five concrete pieces of work. Numbered in execution order.

### Work item 3.1 — Tighten the existing gate

**File:** `e2e/tests/14-accessibility.spec.ts`

Today the spec fails only on `critical` and warns on `serious`. Promote
`serious` to a hard failure. The spec already collects them at line 36 — just
remove the `criticalOnly` filter at line 48.

Before promoting, run the spec against the current build to capture the
baseline of `serious` violations. That output is the work-list for items
3.3 + 3.4.

**Run (in CI, or in a Playwright-clean dev environment):**
```bash
# This is a Playwright UI suite, not a Jest suite — npm run test:e2e is Jest.
npm run test:e2e:ui -- e2e/tests/14-accessibility.spec.ts --project=chromium --reporter=list
```

**Environment requirements (discovered 2026-04-27):** running this from
the docker dev stack from a developer host requires:
- `TZ=UTC` (the backend's `start:dev` enforces a UTC precondition via
  `DM-4-4` and refuses to boot otherwise)
- The `test-results/playwright/` directory must be writable by the
  current user (it can end up owned by root after prior CI/docker runs;
  `sudo chown -R $USER test-results/` clears this)
- Playwright's `webServer` config in `playwright.config.ts` expects to
  manage its own backend on `:3000` and frontend on `:4173`. Pointing
  it at the docker-compose dev stack via `PLAYWRIGHT_BASE_URL` is not
  enough — the `webServer` block still tries to spawn its own services
  and trips on the dev DB / TZ / port mismatches.

**Practical recommendation:** run the baseline capture in CI. The
existing `deploy-staging` flow runs Playwright in a clean container
where these constraints are already satisfied; adding a `--reporter=json`
output and capturing it as a CI artifact gives the same baseline data
without the local-env friction.

**Success:** spec output lists every violation per role dashboard.

### Work item 3.2 — Expand axe coverage beyond dashboards

The current spec covers 6 dashboards + login. The high-traffic surfaces missing
are:

| Surface | Path | Why |
|---|---|---|
| Projects list | `/projects` | Filter bar, DataTable, search input |
| Project detail | `/projects/:id` | Tabs, charts (excluded), action buttons |
| Staffing desk | `/staffing-desk` | Heaviest filter bar in the app |
| Workforce planner | `/staffing-desk?view=planner` | Drag-and-drop, tooltip-driven |
| Assignments | `/assignments` | List + create modal trigger |
| Cases | `/cases` | List + create flow |
| Time management | `/time-management` | Reject modal (the rejection-reasons fetch we just fixed) |
| Create Project | `/projects/new` | 3-step form wizard, validation messages |
| Create Case | `/cases/new` | Form |
| Create Staffing Request | `/staffing-requests/new` | Form |
| Org chart | `/org-chart` | d3-rendered SVG; verify keyboard traversal works |
| Pulse 360 | `/pulse/people-360` | Tabs, gauge chart, filter |

Add a new `test.describe('@a11y feature surfaces')` block that iterates over
this matrix. Use `loginAs(page, 'admin@…', '…')` so every route is reachable
in one test run. Exclude `.recharts-wrapper` and `.org-chart svg` to avoid
chart-library false positives.

**Success:** axe scan runs on all 12 surfaces, results exported per surface.

### Work item 3.3 — Fix the violations surfaced by 3.1 and 3.2

This is the bulk of the work. Concrete patterns DC commonly trips:

| Pattern | Likely fix |
|---|---|
| `aria-required-attr` on a custom select | add `aria-required="true"` or use native `<select required>` |
| `button-name` on chevron-only collapse buttons | add `aria-label="Expand section"` / `"Collapse section"` |
| `color-contrast` on `var(--color-text-muted)` against `var(--color-bg)` | escalate to design token review — likely a token tweak in `frontend/src/styles/design-tokens.ts` rather than per-component |
| `landmark-one-main` missing `<main>` wrapper | add a single `<main>` to `PageContainer` (1 file, fixes app-wide) |
| `region` complaints on dashboard `<section>` blocks | add `aria-label` to each major `SectionCard` based on its `title` prop (the prop already exists; just thread to `aria-label` on the wrapping element) |
| `dialog-name` on `ConfirmDialog` and modals | ensure `aria-labelledby` points to the title element |
| `frame-title` on iframes | n/a — DC has no iframes |
| `link-name` on icon-only links (rare in DC) | add `aria-label` |

**Method:** open one violation in DevTools, fix it, re-run the spec, move to
the next. Don't batch fixes — verify each one closes that violation
individually.

### Work item 3.4 — Filter-bar audit

The audit text specifically called out filter bars. Concrete files:
- `frontend/src/routes/projects/ProjectsPage.tsx` — title-bar search + 4 selects
- `frontend/src/routes/staffing-desk/StaffingDeskPage.tsx` — heaviest filter bar
- `frontend/src/routes/assignments/AssignmentsPage.tsx`
- `frontend/src/routes/cases/CasesPage.tsx`
- `frontend/src/routes/time-management/TimeManagementPage.tsx`
- `frontend/src/components/common/FilterBar.tsx` — the shared primitive
- `frontend/src/components/staffing-desk/WorkforcePlanner.tsx` — heavy custom filters

For each:
1. **Inputs/selects without a wrapping `<label>`:** add a label or
   `aria-label`. Most DC inputs already use `<label className="field">` which is
   fine; the gaps are inline filter bars where the input sits next to free
   text.
2. **Search inputs with `placeholder="Search…"` but no label:** add
   `aria-label="Search projects"` (or whichever entity).
3. **`<select>` with no visible label:** same — `aria-label="Filter by
   priority"`.
4. **"Clear all" / "Reset" buttons:** verify `aria-label` matches the visible
   text. Skip if visible text is already `Clear all`.

### Work item 3.5 — Screen-reader manual pass

Axe catches structural violations but not "this flow is unusable with NVDA."
After 3.3 + 3.4 close all the automated findings, run a manual pass:

| Tool | Flow |
|---|---|
| VoiceOver (macOS) or NVDA (Windows) | Login → dashboard → click a KPI → drill down |
| Same | Create assignment from staffing desk |
| Same | Approve a timesheet from time management |
| Keyboard only | Navigate the workforce planner without a mouse |

Capture any flows where the screen reader skips a critical action button or
reads a non-semantic chunk of UI. Fix as 3.3 violations.

---

## 4. Verification gate

A11Y-01 is **done** when ALL of these hold:

- [ ] `e2e/tests/14-accessibility.spec.ts` covers the 12 surfaces in 3.2
- [ ] The spec fails on `serious` violations, not just `critical`
- [ ] Spec passes on the current main build
- [ ] One manual screen-reader pass through the four flows in 3.5 is logged
      (notes captured in this file under §6)
- [ ] No new files / components introduce raw `<input>`, `<select>`, or
      icon-only `<button>` without `aria-label` (add an ESLint rule:
      `jsx-a11y/label-has-associated-control` is the right one — the project
      already has `eslint-plugin-jsx-a11y` available in NestJS / React
      ecosystems; verify it's wired in `.eslintrc`)

---

## 5. Estimated effort

- Work item 3.1 + 3.2: **30–60 min** (test scaffolding)
- Work item 3.3: **2–4 hours** (depends entirely on what axe surfaces; could
  range from a handful of fixes to dozens)
- Work item 3.4: **45 min** (5 filter bars × ~10 min each)
- Work item 3.5: **30 min** (manual run + notes)
- ESLint rule wiring: **15 min** if the plugin is already installed,
  ~30 min if not

**Total realistic estimate: 4–7 hours.** Bias toward the high end if the
baseline serious-violations count is large.

---

## 6. Things to NOT do

- Do NOT bulk-add `aria-label` to every input/button without first running
  axe — you'll add noise without measurable improvement and may shadow
  better-suited native labels.
- Do NOT change `StatusBadge` — already has dual-cue (text + color). The
  audit text was generic; DC's implementation is already correct.
- Do NOT expand the axe rule set to `wcag2aaa` or beyond `wcag2aa`. AAA is
  not the target; aaa-grade contrast would force a design-token rewrite.
- Do NOT touch chart libraries. They're excluded for good reason — recharts
  and d3-org-chart generate noisy false positives. Verify keyboard traversal
  manually instead.

---

## 7. Files to inspect (start-of-session checklist)

```bash
# How many critical/serious violations exist today, before any changes?
npx playwright test e2e/tests/14-accessibility.spec.ts --reporter=list 2>&1 | tee /tmp/a11y-baseline.log

# How many filter-bar files?
grep -rln "filter-bar\|FilterChip\|filterBar" frontend/src/

# Existing aria-label coverage (sanity baseline before/after)
grep -rn "aria-label=" frontend/src/ | wc -l
```

---

## 8. Open questions / decisions for the session owner

1. **Should we promote `serious` to fail in CI immediately, or land 3.3 first
   then flip the gate?** Recommended: land all of 3.3 first, then flip in the
   same PR that closes A11Y-01. Otherwise CI breaks for everyone mid-work.
2. **Do we add a dedicated `npm run test:a11y` script?** Probably yes — splits
   the slow a11y suite from the fast e2e suite.
3. **Is the workforce planner expected to be keyboard-accessible?** It uses
   `@dnd-kit/core` which has built-in keyboard support; verify it's enabled in
   the configuration. If not, scope a separate enhancement — the current audit
   item doesn't require it.

---

## 9. Manual SR pass log

_(empty — populate during work item 3.5)_
