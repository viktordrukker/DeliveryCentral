# UX Operating Laws

These 10 laws are enforceable rules for every UI change in DeliveryCentral.
Violating any law is a bug that must be fixed before the task is complete.

---

## Law 1: Three-Click Rule
Every core business action (approve, assign, submit, resolve) must be reachable
in 3 clicks or fewer from the user's role dashboard.

## Law 2: No Dead-End Screens
Every page and every error state must offer at least one forward action
(retry, go to dashboard, create entity, clear filters). A screen with no
clickable next step is a bug.

## Law 3: No Context Loss After Actions
After a create, update, or delete action, the user stays in their working
context. Do not navigate away unless the user explicitly requested it.
Show a success toast with next-action suggestions instead.

## Law 4: Action-Data Adjacency
The action button for a data item must be within 200px of that item.
Never force the user to scroll to a separate toolbar to act on a row
they are looking at.

## Law 5: Filter Persistence via URL
All list-page filters are stored in URL search params. Navigating to a
detail page and pressing Back must restore the filtered view. Filters
reset only on explicit "Clear all" click.

## Law 6: No Duplicated User Input
Pre-fill every field that can be derived from context: current user,
current project, date defaults, assignment data. Never ask the user to
type something the system already knows.

## Law 7: One-Screen Approval
All context needed to approve or reject (submitter, amounts, dates,
comparison data) must be visible on one screen alongside the action
buttons. No scrolling or tab-switching to reach the Approve button.

## Law 8: One-Screen Exception Resolution
Exception detail, root cause, related entities, and resolution actions
must all be visible without scrolling. The user resolves in-place.

## Law 9: Every KPI Is a Clickable Drilldown
Every number on a dashboard card must link to the filtered list that
produced it. A non-clickable KPI is a bug. Log a console.warn in dev
mode if a StatCard is rendered without an href.

## Law 10: Workspace Continuity
Remember the user's last state per page: selected tab, scroll position,
expanded sections, sort order. Use sessionStorage or URL params. The
user should never re-orient themselves after navigating away and back.
