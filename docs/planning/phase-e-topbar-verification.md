# Phase E — Topbar + Approvals deep-link verification (issues #313 + #315)

## Issue #313 — Canvas topbar targets

The canvas topbar (`TopHeaderV2` — shipped in PR #290) wires three quick actions. Each verified below:

### + New menu

| Action | Target | Verified |
|---|---|---|
| New project | `/projects/new` | ✅ FE route exists (handled by `frontend/src/app/router.tsx`); BE endpoint `POST /api/projects` is available to `PROJECT_DELIVERY_ROLES` |
| New staffing request | `/staffing-requests/new` | ✅ FE route exists; BE `POST /api/staffing-requests` available to `STAFFING_ROLES` |
| New leave request | `/leave/new` (or `/leave?action=new`) | ⚠ FE-side concern — `LeavePage` should handle `?action=new` to open the create drawer. BE endpoint `POST /api/leave-requests` already exists for `ALL_AUTHENTICATED_ROLES`. No BE change needed. |

### ⌘K search

Confirmed via inspection of `CmdkSearchService` (issue #270, shipped) — indexes:

- **Person** — by displayName, primaryEmail, personNumber
- **Project** — by name, projectCode, description
- **ProjectPosition** — by role, summary (covers both Approvals rows where `fillStatus=PROPOSED` and Bench positions)
- **CaseRecord** — by caseNumber, summary (covers HR Queue items)
- **ProjectAssignment** — by Person.displayName and Project.name (joined)

All 5 canvas surfaces are reachable via ⌘K. **No additional indexing work needed for Phase E.**

### ? help icon

Targets `/help`. FE-only route; BE has `/api/help-center/*` endpoints for content. Verified accessible to `ALL_AUTHENTICATED_ROLES`.

### Conclusion

All three topbar targets are wired correctly. No BE changes required. FE owns the `?action=new` query-param parsing on `/leave` (and similar) if that pattern is preferred over a dedicated `/leave/new` route.

---

## Issue #315 — `?focus=:id` deep-link convention

The unified approvals queue (`ApprovalQueueItemDto`, issue #264) sets `href` per source. Verified shape:

| Source | href pattern |
|---|---|
| `position-proposal` | `/positions/:id` — direct position detail page (the canvas wants `/staffing-desk?focus=:requestId` instead) |
| `budget` | `/projects/:projectId?tab=money&approval=:id` ✅ |
| `activation` | `/projects/:projectId?activation=:id` ✅ |
| `leave` | `/leave-requests/:id` — direct detail page (the canvas wants `/time-management?focus=:leaveId`) |
| `case` | `/cases/:id` ✅ |
| `skill-review` | not yet implemented (no source in v1) |

### Discrepancies between current href and canvas convention

Two sources use direct detail pages instead of the `?focus=` pattern:

1. **position-proposal** — current goes to `/positions/:id`, canvas wants `/staffing-desk?focus=:id`
2. **leave** — current goes to `/leave-requests/:id`, canvas wants `/time-management?focus=:id`

### Why I'm not changing them in this PR

The `/positions/:id` and `/leave-requests/:id` URLs are direct detail surfaces and likely produce a better UX than scrolling-to-row on a list page. The canvas `?focus=` pattern is for the Staffing Desk + Time Management pages where the FE may not yet support per-row focus + scroll + highlight.

**Decision:** Defer the href change to a FE-side PR that simultaneously adds `?focus=:id` parsing on `/staffing-desk` and `/time-management`. The BE href is easy to flip in a one-line PR once those FE handlers exist. Filing as TODO in the issue.

### Recommendation

When the FE adds `?focus=:id` parsing to Staffing Desk + Time Management:

```diff
- href: `/positions/${r.id}`,
+ href: `/staffing-desk?focus=${r.id}`,
```

```diff
- href: `/leave-requests/${r.id}`,
+ href: `/time-management?focus=${r.id}`,
```

A single 2-line edit to `unified-approval-queue.service.ts`. Until then, the direct detail URLs work — clicking "Open →" lands the user on the right entity.

---

## Reference

- Plan: `/home/drukker/.claude/plans/v2-lean-restructure-phase-e.md` §6 → NEW-E5, NEW-E7
- TopHeaderV2: `frontend/src/components/layout/TopHeaderV2.tsx` (PR #290)
- CmdkSearchService: `src/modules/search/application/cmdk-search.service.ts` (issue #270)
- UnifiedApprovalQueueService: `src/modules/dashboard/application/unified-approval-queue.service.ts` (issue #264)
