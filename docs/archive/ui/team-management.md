# Team Management UI

## Route
- `/teams`

## Purpose
- Manage operational teams as a separate concept from org units.
- Create teams without embedding project or hierarchy logic in the UI.
- Add and remove members through the backend team APIs.

## Data Sources
- `GET /teams`
- `POST /teams`
- `POST /teams/{id}/members`
- `GET /teams/{id}/members`
- `GET /org/people`

## Page Structure
- Team list
  - Shows available teams, codes, and member counts.
  - Selecting a team loads member detail on the right-hand side.
- Create team panel
  - Captures team name, code, and optional description.
  - Refreshes the list after a successful create.
- Team details panel
  - Shows team metadata, current members, and member management controls.
- Member selector
  - Lists people not already in the selected team.
  - Supports add and remove actions through explicit buttons.

## UI States
- Loading
  - Shown while teams and people are being fetched.
- Empty
  - Shown when there are no teams yet.
  - Shown when a selected team has no active members.
- Error
  - Surfaces backend or transport errors without hiding the page structure.
- Success
  - Confirms create and member update actions with a visible status banner.

## Behavior Notes
- Teams are treated as operational resource groups, not org units.
- The page is API-driven and does not hardcode team entities.
- Member add and remove actions always go through the backend write endpoints.
- Team member traceability remains person-based; the UI does not collapse people into anonymous counts.

## Test Coverage
- `frontend/src/routes/teams/TeamsPage.test.tsx`
  - creates a team
  - adds a member
  - shows the empty-state path
