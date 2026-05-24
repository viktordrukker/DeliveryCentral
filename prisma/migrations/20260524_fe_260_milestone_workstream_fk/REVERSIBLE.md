# Reversible migration

Pure additive — adds a foreign-key constraint and a covering index on
`project_milestones.workstreamId`. No data is touched (column already
existed since V2-0, just unconstrained).

Rollback: drop the FK + the index. Existing rows keep their
`workstreamId` values (orphans become possible again, matching the
pre-FK state). See `rollback.sql`.
