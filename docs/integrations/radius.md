# RADIUS Account Presence Integration

## Purpose

The RADIUS integration provides read-only visibility into enterprise account presence. It does not authenticate users, replace RBAC, or mutate external identity systems.

## Boundaries

- RADIUS is treated as an external read-only source.
- Internal `Person` records remain the operational source of truth.
- Missing external accounts do not delete or deactivate internal employees.
- Sync only creates or updates external account reference records.
- No write-back or provisioning is supported.

## Endpoints

### `POST /integrations/radius/accounts/sync`

Triggers a read-only account presence sync.

Behavior:
- fetches external account references from the adapter
- attempts to match accounts to internal `Person` records by configured strategy
- stores external account reference metadata
- records sync status

### `GET /integrations/radius/status`

Returns current sync health and linkage summary.

### `GET /integrations/radius/reconciliation`

Returns a review-oriented reconciliation snapshot for operators.

Supports optional query params:
- `category`
  - `MATCHED`
  - `UNMATCHED`
  - `AMBIGUOUS`
  - `PRESENCE_DRIFT`
- `query`

Returns:
- summary counts by reconciliation category
- last sync timestamp/outcome
- reconciliation items with:
  - external account summary
  - linked internal person id if present
  - account presence state
  - source type
  - operator-friendly summary

## Matching

Matching is configuration-driven through `RADIUS_ACCOUNT_MATCH_STRATEGY`.

Supported values:
- `email`
- `none`

When `email` is enabled:
- external account email is matched against `Person.primaryEmail`
- matched accounts are linked to the existing internal person
- internal employee business fields are preserved

When `none` is enabled:
- account references are imported as unmatched visibility records only

## Reconciliation review categories

- `MATCHED`
  - the external account presence linked safely to an internal person
- `UNMATCHED`
  - the account remains unmatched and needs operator review
- `AMBIGUOUS`
  - the account mapping was not safe to resolve automatically
- `PRESENCE_DRIFT`
  - a previously linked account was not observed in the latest sync and should be reviewed for drift

This review layer is read-only. It helps operators understand account-presence alignment without turning RADIUS into org truth.

## Persisted data

`ExternalAccountLink` stores:
- provider
- source type
- external account id
- external username
- external display name
- external email
- account presence state
- optional matched `personId`
- matched-by strategy
- source timestamps

`IntegrationSyncState` stores:
- provider
- resource type
- scope key
- last sync timestamp
- last outcome
- last error

`RadiusReconciliationRecord` stores:
- reconciliation category
- operator-friendly summary
- linked internal person id if present
- candidate person ids when review is ambiguous
- account presence state
- source timestamps
- last evaluated timestamp

## Reconciliation rules

- linked internal employees are never overwritten silently
- unmatched external accounts remain visible as external references
- later syncs do not destructively delete previously imported account links
- account presence metadata is isolated from org-structure truth

## Non-goals

This foundation does not implement:
- RADIUS authentication
- login/session replacement
- identity provisioning
- org-source reconciliation
- write-back to any external directory or network appliance
