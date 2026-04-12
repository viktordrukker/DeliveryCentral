# M365 / Exchange Directory Integration

## Purpose

This slice provides a read-only foundation for importing users and manager metadata from Microsoft 365 / Exchange / Entra-backed directory sources into the platform.

## Boundary rules

- external directory is read-only
- no write-back to M365, Exchange, or Entra ID
- internal Organization remains the operational source of truth after reconciliation
- imported records must stay traceable to their external identities
- internal business fields must not be silently overwritten on link/reconciliation

## Implemented endpoints

### `POST /integrations/m365/directory/sync`

Triggers a directory synchronization run.

Returns:

- `employeesCreated`
- `employeesLinked`
- `managerMappingsResolved`
- `syncedPersonIds`

### `GET /integrations/m365/directory/status`

Returns directory integration status including:

- provider
- capability flags
- configured match strategy
- default import org unit
- linked identity count
- latest sync status metadata

### `GET /integrations/m365/directory/reconciliation`

Returns a review-oriented reconciliation snapshot for operators.

Supports optional query params:

- `category`
  - `MATCHED`
  - `UNMATCHED`
  - `AMBIGUOUS`
  - `STALE_CONFLICT`
- `query`

Returns:

- summary counts by reconciliation category
- last sync timestamp/outcome
- reconciliation items with:
  - external identity summary
  - linked internal person id if present
  - status category
  - operator-friendly summary
  - source metadata safe for review

## Reconciliation behavior

### New employee

If no internal match exists:

- a new internal `Person` is created through the organization employee creation flow
- the employee is created as `INACTIVE`
- an external identity link is stored

### Existing employee

If a configured match is found:

- the existing `Person` is linked
- the internal person is not destructively overwritten
- source metadata is stored on the external identity link

### Reconciliation review categories

- `MATCHED`
  - the external identity linked or refreshed safely
- `UNMATCHED`
  - the external identity could not be safely reconciled
- `AMBIGUOUS`
  - the external identity needs operator review because mapping was not safe to resolve automatically
- `STALE_CONFLICT`
  - the linked identity was not seen in the latest sync, or related mapping drift still needs review

This review layer is read-only and exists to help operators understand sync state without turning raw logs into the primary control surface.

## Current matching strategy

Config-driven:

- `email`
- `none`

Environment-backed settings:

- `M365_DIRECTORY_DEFAULT_ORG_UNIT_ID`
- `M365_DIRECTORY_MATCH_STRATEGY`

## Manager metadata

If manager relations are available from the adapter:

- external manager user id is stored on the identity link
- resolved internal manager person id is stored when the manager also has a resolved internal link
- reporting lines are not automatically rewritten by this slice

This keeps imported manager metadata traceable without silently changing operational org authority.

## Persistence

### External identity linkage

`PersonExternalIdentityLink` stores:

- provider
- external user id
- external principal name
- matched-by strategy
- source department / job title
- source account-enabled flag
- external manager user id
- resolved internal manager person id
- source update timestamp
- last seen timestamp

### Sync state

Directory sync state is stored separately from business data so sync failures do not mutate operational organization records.

### Reconciliation review records

`M365DirectoryReconciliationRecord` stores the latest review state per external identity, including:

- reconciliation category
- operator-friendly summary
- candidate internal person ids if review is ambiguous
- linked internal person id when available
- source timestamps and source metadata
- last evaluated timestamp

This does not change internal org truth. It only captures a reviewable reconciliation outcome.

## Adapter responsibilities

The adapter layer:

- fetches directory users
- fetches manager relations
- maps external records into the internal anti-corruption shape
- publishes sync events

The adapter does not:

- create internal domain objects directly
- write to the directory
- bypass reconciliation rules

## Non-goals in this slice

- outbound provisioning
- destructive deactivation on missing external users
- automatic reporting-line replacement
- write-back to external identity systems
- direct operator edits back into M365
