# Bulk Assignment

## Goal

Bulk assignment allows project and resource managers to request multiple formal
`ProjectAssignment` records in one operation without bypassing the existing
assignment lifecycle.

## Transaction strategy

This workflow uses `PARTIAL_SUCCESS`.

Why:

- operational users need the valid assignments to be created even if some items
  are invalid
- every entry still goes through the standard single-assignment domain service
- item-level failures remain visible and auditable instead of being hidden by a
  full rollback

## Rules

- every bulk item is still a normal `ProjectAssignment`
- person and project existence are validated per item
- inactive employees cannot receive new assignments
- overlapping person-to-project assignments are rejected per item
- successful items keep the standard assignment audit and notification flow
- failed items are returned explicitly with an error code and message

## Result model

The bulk workflow returns:

- `strategy`
- `totalCount`
- `createdCount`
- `failedCount`
- `createdItems[]`
- `failedItems[]`

This keeps operational outcomes explicit and safe for UI and admin tooling.
