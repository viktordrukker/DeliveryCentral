-- Rollback for 20260503_hd_02_project_approval_gate.
--
-- Drops the table + enum the forward migration adds. The
-- `PENDING_APPROVAL` enum value is NOT dropped — Postgres has no
-- ALTER TYPE … DROP VALUE primitive, and any column referencing it
-- would block the operation. Operationally: rollback the application
-- code first (so no rows are inserted with status='PENDING_APPROVAL'),
-- then run this rollback to drop the dependent table + decision enum.
--
-- If a row already exists with status='PENDING_APPROVAL', flip those
-- rows back to 'DRAFT' before applying this rollback.

DROP TABLE IF EXISTS "project_activation_approvals";
DROP TYPE  IF EXISTS "ProjectActivationDecision";

-- Note: enum value cleanup for ProjectStatus.PENDING_APPROVAL needs a
-- multi-step CREATE-NEW-ENUM / ALTER-COLUMN / DROP-OLD dance and is
-- intentionally NOT scripted here — defer to a dedicated cleanup
-- migration if the rollback persists past one release.
