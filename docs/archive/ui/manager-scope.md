# Manager Scope

## Purpose
The Manager Scope page is the first visible manager-oriented read model in the frontend. It surfaces reporting visibility from `GET /org/managers/{id}/scope` without implying approval authority.

## Route
- `/org/managers/:id/scope`

## Data shown
- selected manager summary
- direct reports
- dotted-line related people
- current org unit for each person
- current assignment count for each person
- quick links to person details and filtered assignments

## Layout choices
The page uses separated sections for:
- direct reports
- dotted-line visibility

This is deliberate. Solid-line reporting and dotted-line visibility are distinct concepts and should not collapse into one undifferentiated list.

## Boundary notes
- the page is read-only
- visibility is not the same as approval authority
- the current layout leaves room for future approval queues, staffing actions, and planning widgets without changing the reporting model sectioning
