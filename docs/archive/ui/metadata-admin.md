# Metadata Admin

## Purpose
The metadata admin page exposes controlled vocabularies as first-class platform configuration. It is intentionally separate from business pages so dictionaries, custom fields, workflows, and layouts can evolve without hardcoding business constants into the UI.

## Route
- `/metadata-admin`

## Current scope
- Lists metadata dictionaries from `GET /metadata/dictionaries`
- Shows dictionary details from `GET /metadata/dictionaries/{id}`
- Displays entry values, enabled/disabled state, and related configuration summaries
- Provides explicit disabled scaffolding for future dictionary and entry edit flows

## Layout
- Left panel: dictionary catalog
- Right panel: selected dictionary details, entries, related custom fields, workflow usage, and layout usage

## Data rules
- No business dictionaries are hardcoded in the page
- All dictionary names, keys, and entries come from the API
- Mutation affordances are placeholders until write endpoints exist

## Future extensions
- Custom field editor
- Workflow editor
- Layout editor
- Scope-aware filtering by org unit
- Audit history for configuration changes
