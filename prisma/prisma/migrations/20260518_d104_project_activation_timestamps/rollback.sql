-- Rollback for 20260518_d104_project_activation_timestamps.

ALTER TABLE "project_activation_approvals"
  DROP COLUMN IF EXISTS "updatedAt",
  DROP COLUMN IF EXISTS "createdAt";
