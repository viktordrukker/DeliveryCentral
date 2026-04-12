# Manager Scope API

## Endpoint

### `GET /org/managers/{id}/scope`

Returns manager-scoped visibility for:

- direct reports
- dotted-line related people
- current org unit summary
- current line manager summary on each person
- current assignment count summary

## Query parameters

- `page`
- `pageSize`
- `asOf` optional placeholder for time-based scope queries

## Important distinction

This slice is about visibility, not approval authority.

- direct reports reflect current solid-line reporting
- dotted-line people are returned separately
- approval authority may later diverge from visibility and must not be assumed to be identical

## Notes

- read-only slice
- useful for future manager portal and approval routing support
- backed by the organization reporting model and demo dataset
