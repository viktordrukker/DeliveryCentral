# Bulk Assignments UI

## Route
- `/assignments/bulk`

## Purpose
- Create multiple person-to-project assignment requests in one batch.
- Keep the bulk flow explicit about partial success instead of hiding item-level failures.

## Data Sources
- `GET /org/people`
- `GET /projects`
- `POST /assignments/bulk`

## UI Structure
- Bulk assignment form
  - requester
  - project
  - staffing role
  - allocation percent
  - start and optional end date
  - optional batch note
- Employee multi-select
  - checkbox-driven selection of multiple employees
  - shows org unit and primary email for quick identification
- Batch result summary
  - strategy
  - created count
  - failed count
- Created items table
  - per-item assignment results
- Failed items table
  - per-item error code and message

## Behavior Notes
- The page reuses the existing people and project read APIs rather than maintaining separate lookup state.
- The batch submit uses the backend `PARTIAL_SUCCESS` result model directly.
- The UI does not collapse failures into a generic toast. Each failed item remains visible with its code and message.
- Successful items are still normal individual assignments; the bulk page is only a submission convenience.

## States
- Loading
  - shown while people and project options are fetched
- Empty
  - shown if prerequisite people or projects are unavailable
- Error
  - shows backend or transport errors above the form
- Result
  - shown after a batch submit with separate success and failure sections

## Test Coverage
- `frontend/src/routes/assignments/BulkAssignmentPage.test.tsx`
  - bulk submission
  - partial failure visibility
