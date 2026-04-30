# UX Contract — `TeamsPage`

**Route:** `/teams` ([`route-manifest.ts:129`](../../../frontend/src/app/route-manifest.ts#L129))
**Component:** [`TeamsPage.tsx`](../../../frontend/src/routes/teams/TeamsPage.tsx)
**Grammar:** List-Detail Workflow (Grammar 2) — list of teams + team detail panel
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `ALL_ROLES`.
- **Self-scope:** none.

## 2. Click paths

| Trigger | Destination | Notes |
|---|---|---|
| Team list item | `selectTeam(id)` — updates `selectedTeamId`; loads members | |
| "Open team dashboard" button | `/teams/{id}/dashboard` | |
| Create-team form submit | `POST /teams` | name + code validation pre-API |
| Add Member form | `POST /teams/{id}/members` (action: `add`) | |
| Remove member button | ConfirmDialog → `POST /teams/{id}/members` (action: `remove`) | |

## 3. Form validation

| Form | Rule |
|---|---|
| Create team — Team Name | required (non-empty trim, in handleSubmit) |
| Create team — Team Code | required (non-empty trim) |
| Create team — Description | optional |

## 4. Confirmation prompts

| Action | Message |
|---|---|
| Remove member | `Remove {displayName} from this team?` |

## 5. Toast / notification triggers

_None._ Success/error rendered as inline banners (`success-banner`, `<ErrorState>`).

## 6. Filters / sort / pagination / saved views

- No URL params; no pagination on team list. Person directory fetched at `pageSize=100`.
- `selectedTeamId` is component-local state.

## 7. Empty / loading / error states

| State | Copy |
|---|---|
| Loading | "Loading teams..." |
| Error | dynamic |
| Success | "Created team {name}." or `{action} {person} {action==='add' ? 'to' : 'from'} {team}.` |
| No teams | "No teams are available yet." |
| No selection | "Select a team to manage its members." |
| No members | "This team does not have any active members yet." |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount | `GET /teams`, `GET /org/people?page=1&pageSize=100` |
| Select team | `GET /teams/{id}/members` |
| Create team | `POST /teams` |
| Add/remove member | `POST /teams/{id}/members` (action body) |

## 9. Other notable behaviors

- **First team auto-selected** on load when teams exist.
- **Form values reset** to `initialTeamFormValues` after successful create.
- **Member count** displayed inline; "No members" muted text when 0.
- **Team detail grid** shows: Code, Members count, Linked Org Unit, Description.

---

## Mapped regression spec

[`e2e/ux-regression/TeamsPage.spec.ts`](../../../e2e/ux-regression/TeamsPage.spec.ts)
