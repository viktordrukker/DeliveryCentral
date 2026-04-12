# Org Chart

## Purpose
The Org Chart page presents the organizational hierarchy as an operational structure, not a decorative diagram. It is the frontend view for reasoning about visibility, management scope, and future approval routing.

## Route
- `/org`

## Data source
- `GET /org/chart`

## What the page shows
- hierarchical org unit tree
- org-unit manager summary
- members within each org unit
- dotted-line relationships in a dedicated secondary panel

## Interaction model
- expand/collapse per org unit node
- client-side search across org unit names, codes, kinds, managers, and members
- quick links from members to person details

## Design notes
Dotted-line relationships are intentionally rendered in a separate contextual panel rather than forcing a mixed graph into the main tree. This keeps the hierarchy readable while preserving the distinction between structural containment and non-primary reporting relationships.
