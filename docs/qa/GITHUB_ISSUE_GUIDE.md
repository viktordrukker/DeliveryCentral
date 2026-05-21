# How to file a bug, issue, or feature proposal — GitHub Issues

_Repo: <https://github.com/viktordrukker/DeliveryCentral>_
_Audience: QA testers (Anna, Alina, Ekaterina, Ruslan)._
_Companion to: `docs/qa/QA_PRODUCT_GUIDELINE.md`._

---

## 0. The 30-second version

1. Reproduce it twice.
2. Take a screenshot or short screencast.
3. Open <https://github.com/viktordrukker/DeliveryCentral/issues/new>.
4. Pick the right template below (Bug / UX / Feature), paste it in, fill it out.
5. Add labels (see §5).
6. Submit. Do **not** assign yourself; the maintainer triages.

---

## 1. Before you file — the checklist

- [ ] **I can reproduce it.** Closed-and-opened the browser tab, re-ran the steps, still happens.
- [ ] **I have steps.** Not "it broke" — numbered steps from a known starting state (e.g. "logged in as `qa.anna…`").
- [ ] **I searched existing issues.** `is:open <keyword>` on the issues tab. No duplicate.
- [ ] **I know the URL.** Copy the URL from the browser bar at the point of failure — filters live in there.
- [ ] **I know the persona.** Your QA account, or a "View as" identity? Note which one.
- [ ] **I have evidence.** Screenshot or screencast attached. For data bugs, a screenshot of the inconsistency.
- [ ] **It's one finding.** If you have two unrelated problems, that's two issues.

If any box is unchecked — stop and fix that first.

---

## 2. Filing via the GitHub web UI

1. Go to **<https://github.com/viktordrukker/DeliveryCentral/issues/new/choose>** _(if templates are configured)_ or **<https://github.com/viktordrukker/DeliveryCentral/issues/new>**.
2. **Title** — see §4 for the title formula.
3. **Body** — paste the matching template from §3 and fill it in.
4. **Labels** (right sidebar) — pick the right set from §5.
5. **Attachments** — drag-drop screenshots/videos directly into the body. Mobile-friendly: paste image directly. For >10MB videos, upload to a shared drive and link.
6. Click **Submit new issue**.
7. **Note the issue number** (e.g. `#142`) in your test session log so you can cross-reference later.

### Optional: filing via `gh` CLI

If you have GitHub CLI installed and authenticated:

```bash
gh issue create \
  --repo viktordrukker/DeliveryCentral \
  --title "[bug][P1][area:staffing] Auto-match returns 0 candidates when filter is 'Frontend'" \
  --label "bug,area:staffing" \
  --body-file /tmp/my-finding.md
```

You can use `--body-file -` to pipe stdin, or `--body "…"` for a one-liner.

---

## 3. Templates — copy these into the issue body

### 3.A — Bug report

````markdown
## Summary
_One sentence: what is broken._

## Severity
- [ ] **P0** — blocks a core flow / data loss / security leak. Fix today.
- [ ] **P1** — broken happy path, no workaround. Fix this sprint.
- [ ] **P2** — broken edge path, workaround exists. Backlog.
- [ ] **P3** — cosmetic / minor inconvenience.

## Environment
- Stand: **staging** (`https://<staging-host>`)
- Persona used: `qa.anna.surkova@…` (or "View as `lucas.reed@itco.local`")
- Browser + version: e.g. Chrome 124 on Windows 11
- Time observed: 2026-05-21 14:32 UTC

## Steps to reproduce
1. Log in as `…`
2. Open `/staffing-desk?view=planner`
3. Apply filter "…"
4. Click "…"

## Expected
_What you thought would happen._

## Actual
_What actually happened. Include the URL at the point of failure._

## Evidence
_Drag-drop screenshot or video here. For data inconsistencies, show both numbers side-by-side._

## Reproduction rate
- [ ] Every time
- [ ] About half the time
- [ ] Once — could not reproduce on retry

## Notes / leads
_Any console errors? Network 500s? Did "View as" change the behavior? Any QA-tagged seed data you created?_
````

---

### 3.B — Feature proposal / improvement

````markdown
## Job to be done
_As a `<role>`, when I am `<situation>`, I want to `<goal>` so I can `<outcome>`._

Example: _As a Resource Manager, when I'm running the weekly capacity meeting, I want to export the planner grid to XLSX so I can paste it into the meeting deck._

## Why now
_What's the cost of not doing this? Is there a workaround today? Frequency the job comes up?_

## Suggested solution (optional)
_One short paragraph. Do not over-design — describe the outcome, not the implementation._

## Affected roles
- [ ] Admin
- [ ] Director
- [ ] Delivery Manager
- [ ] Project Manager
- [ ] Resource Manager
- [ ] HR Manager
- [ ] Employee

## Where it would live
_Existing page + section, or "new page under /…"._

## Out of scope
_What this proposal is NOT asking for._
````

---

### 3.C — UX issue (UX-law violation, friction, copy)

````markdown
## Summary
_One sentence: what is awkward._

## Which UX law (if any)
_Reference: `.claude/rules/ux-laws.md` in the repo._
- [ ] L1 Three-click rule
- [ ] L2 No dead-end screens
- [ ] L3 No context loss after actions
- [ ] L4 Action-data adjacency (200px)
- [ ] L5 Filter persistence via URL
- [ ] L6 No duplicated user input
- [ ] L7 One-screen approval
- [ ] L8 One-screen exception resolution
- [ ] L9 Every KPI is a clickable drilldown
- [ ] L10 Workspace continuity
- [ ] None — general friction / copy

## Where
- URL: `/…`
- Persona: …

## What happens today
_Steps + result._

## What good looks like
_One sentence._

## Evidence
_Screenshot._
````

---

## 4. Title formula

```
[<type>][<priority>][area:<module>] <short, specific summary in present tense>
```

- `<type>` — `bug`, `ux`, `feature`, `doc`, `perf`
- `<priority>` — `P0`–`P3` for bugs; omit for feature/ux/doc.
- `area:<module>` — pick the closest: `dashboard`, `staffing`, `projects`, `timesheets`, `cases`, `org`, `admin`, `auth`, `integrations`, `reports`, `audit`.

### Good titles

- `[bug][P1][area:staffing] Auto-match returns 0 candidates when "Frontend" filter is applied`
- `[bug][P2][area:dashboard] KPI "Open requests" shows 7, drilldown list has 5 rows`
- `[ux][area:projects] Risk-add button forces scroll on /projects/:id top section (L4 violation)`
- `[feature][area:reports] Export planner grid to XLSX`

### Bad titles (don't do this)

- `Bug` — useless
- `Staffing is broken` — vague
- `Auto-match is not working when I select frontend and then engineering and the project is the one I created yesterday but only sometimes` — way too long, no shape

---

## 5. Labels

Today the repo has the GitHub defaults: `bug`, `enhancement`, `documentation`, `question`, `duplicate`, `wontfix`, `invalid`, `good first issue`, `help wanted`.

**Use these on every issue:**

| Type of finding | Label(s) |
|---|---|
| Bug / defect | `bug` |
| Feature proposal | `enhancement` |
| UX-law violation / friction | `bug` _(+ mention the UX law in title/body)_ |
| Doc inconsistency | `documentation` |
| Unsure | `question` |

**Suggested additional labels for the maintainer to create** (not blocking — file the issue without them if absent):

- `qa-finding` — anything raised by the QA team.
- `severity:p0` … `severity:p3` — fast filtering.
- `area:dashboard`, `area:staffing`, `area:projects`, `area:timesheets`, `area:cases`, `area:org`, `area:admin`, `area:auth`, `area:integrations`, `area:reports`, `area:audit`.
- `ux-law:L1` … `ux-law:L10` — for UX-law violations specifically.

If those labels exist by the time you file, use them. Otherwise stuff the same info in the title (`[bug][P1][area:staffing]`) so it's still grep-able.

---

## 6. Lifecycle — what happens to your issue

1. **Open** — you filed it.
2. **Triage** — maintainer reads, may ask for clarification. Respond fast (within a day) while context is fresh.
3. **Accepted** — added to `docs/planning/MASTER_TRACKER.md` or directly to a sprint.
4. **In progress** — linked to a PR.
5. **Closed via PR** — fix is merged. **Re-verify on staging within 2 working days.** If still broken, reopen the issue with `RE-OPENED:` prefixed to the latest comment and fresh repro steps.

If an issue is closed as `duplicate`, `wontfix`, or `invalid` — read the closing comment. Don't refile. If you disagree, comment on the closed issue and tag Viktor.

---

## 7. Pull-request friendly behavior (bonus)

If your finding is a 1-line copy fix or a missing label, you may file a PR instead of an issue. Otherwise: **always file the issue first**, even if you also plan to PR. The issue is the conversation; the PR is the patch.

---

## 8. Worked example — end-to-end

> While walking as RM (`sophia.kim@itco.local` via "View as"), I opened `/staffing-desk?view=planner`, set the date range to "next 4 weeks", applied skill filter "Frontend", and clicked **Auto-match**. The result panel said "0 candidates" — but the same filter on the **Requests** view shows 12 frontend people available.

**Title**

```
[bug][P1][area:staffing] Auto-match returns 0 candidates with "Frontend" skill filter (Requests view shows 12)
```

**Body** (template 3.A filled in)

```markdown
## Summary
Auto-match in the Planner returns "0 candidates" when the only filter is "Frontend",
but switching to the Requests view shows 12 frontend candidates available in the same window.

## Severity
- [x] P1

## Environment
- Stand: staging
- Persona used: qa.anna.surkova@… ("View as" sophia.kim@itco.local)
- Browser: Chrome 124 / Windows 11
- Time: 2026-05-21 14:32 UTC

## Steps to reproduce
1. Log in as qa.anna.surkova@…
2. Top bar → View as → sophia.kim@itco.local
3. Open /staffing-desk?view=planner
4. Set date range = next 4 weeks
5. Skill filter = Frontend
6. Click "Auto-match"

## Expected
Auto-match returns the same candidates the Requests view shows (12).

## Actual
Result panel: "0 candidates matched."
URL at failure: https://staging.../staffing-desk?view=planner&from=2026-05-22&to=2026-06-19&skill=frontend

## Evidence
[screenshot-planner-0-candidates.png]
[screenshot-requests-12-candidates.png]

## Reproduction rate
- [x] Every time

## Notes / leads
Console: no errors. Network: /api/staffing/auto-match returns 200 with empty array.
Memory note in repo (reference-planner-distribution-studio.md) mentions a "filter
consistency contract getPlan↔autoMatch" — might be related.
```

**Labels:** `bug`

---

That's it. Keep the loop tight: reproduce → screenshot → file → tag → move on. The fewer steps between finding and filing, the better the bug data.
