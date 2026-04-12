# Dictionaries UI

## Purpose

The dictionaries UI provides an admin-facing editor for metadata-backed person dictionaries at
`/admin/dictionaries`.

It is designed to stay API-driven:

- dictionary types come from `GET /metadata/dictionaries`
- dictionary entries come from `GET /metadata/dictionaries/{id}`
- new entries are created through `POST /metadata/dictionaries/{type}/entries`

The page does not embed fixed grade, role, or skillset values in the UI.

## Route

- `/admin/dictionaries`

## UI structure

The page has two main areas:

- Dictionary list
  - populated from metadata dictionary summaries
  - shows the returned display name and entry counts
- Dictionary editor
  - shows selected dictionary details and current entries
  - includes a form for adding a new entry

## Components

- `DictionaryList`
  - renders the available dictionaries returned by the API
- `DictionaryEditor`
  - renders selected dictionary details and entries
- `DictionaryEntryForm`
  - posts new entry values back to the metadata API

## Behavior

- selects the first returned dictionary by default
- refreshes dictionary summary and detail data after entry creation
- shows loading, error, and empty states
- surfaces a success banner after a new entry is created

## Tests

Coverage lives in:

- `frontend/src/routes/admin/DictionariesPage.test.tsx`

The tests verify:

- dictionaries load and render from API data
- a new entry can be created through the metadata API flow
