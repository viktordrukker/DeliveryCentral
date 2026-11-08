# Reversible migration

Pure additive — appends a nullable `reviewComment` column to
`leave_requests`. No data in existing rows is touched (NULL default).

Rollback: drop the column. See `rollback.sql`. Reviewer comments
captured after this migration shipped will be lost on rollback, but
the row's PENDING / APPROVED / REJECTED status is unaffected.
