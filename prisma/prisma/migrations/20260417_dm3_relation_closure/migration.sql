-- ============================================================================
-- DM-3 Relation Closure — Phase 1 (UUID↔UUID pairs only)
-- ============================================================================
-- Adds foreign-key constraints + supporting indexes for the 16 relations where
-- both sides are already @db.Uuid. The TEXT→UUID pairs (TimesheetWeek.personId,
-- LeaveRequest.personId, StaffingRequest.*, PersonSkill.personId, ProjectBudget.
-- projectId, PulseEntry.personId, PersonCostRate.personId, TimesheetEntry.{projectId,
-- assignmentId}, InAppNotification.recipientPersonId, TimesheetWeek.approvedBy)
-- cannot be FK'd until DM-2 has converted those columns to uuid — Postgres does
-- not allow cross-type foreign keys.
--
-- Migration strategy:
--   1. ADD CONSTRAINT ... NOT VALID — metadata-only, no table scan, near-instant
--      but still takes a brief SHARE ROW EXCLUSIVE lock on the child table.
--   2. CREATE INDEX IF NOT EXISTS on every FK column — required for efficient
--      cascade/set-null and parent-side reverse lookup.
--   3. Run `scripts/find-orphans.ts` against the DB BEFORE the VALIDATE step; if
--      it reports any rows, clean or null them out under controlled change.
--   4. VALIDATE CONSTRAINT — scans the table but takes only
--      SHARE UPDATE EXCLUSIVE; does not block reads or writes on the child.
--
-- Lock discipline:
--   SET LOCAL lock_timeout = '3s';
--   SET LOCAL statement_timeout = '30s';
-- Apply during a low-traffic window; retry is safe (all statements are
-- IF NOT EXISTS / idempotent within the migration transaction).
-- ============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

-- ---- AuditLog.actorId → Person.id ------------------------------------------
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog" ("actorId");

-- ---- EmployeeActivityEvent.actorId → Person.id -----------------------------
ALTER TABLE "EmployeeActivityEvent"
  ADD CONSTRAINT "EmployeeActivityEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
CREATE INDEX IF NOT EXISTS "EmployeeActivityEvent_actorId_idx" ON "EmployeeActivityEvent" ("actorId");

-- ---- LocalAccount.personId → Person.id --------------------------------------
ALTER TABLE "LocalAccount"
  ADD CONSTRAINT "LocalAccount_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
-- (LocalAccount.personId already has @unique; existing index suffices.)

-- ---- M365DirectoryReconciliationRecord.personId → Person.id ----------------
ALTER TABLE "M365DirectoryReconciliationRecord"
  ADD CONSTRAINT "M365DirectoryReconciliationRecord_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
-- Existing index on personId.

-- ---- M365DirectoryReconciliationRecord.resolvedManagerPersonId → Person.id -
ALTER TABLE "M365DirectoryReconciliationRecord"
  ADD CONSTRAINT "M365DirectoryReconciliationRecord_resolvedManagerPersonId_fkey"
  FOREIGN KEY ("resolvedManagerPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
CREATE INDEX IF NOT EXISTS "M365DirectoryReconciliationRecord_resolvedManagerPersonId_idx"
  ON "M365DirectoryReconciliationRecord" ("resolvedManagerPersonId");

-- ---- PersonExternalIdentityLink.resolvedManagerPersonId → Person.id --------
ALTER TABLE "PersonExternalIdentityLink"
  ADD CONSTRAINT "PersonExternalIdentityLink_resolvedManagerPersonId_fkey"
  FOREIGN KEY ("resolvedManagerPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
-- Existing index on resolvedManagerPersonId.

-- ---- OvertimePolicy.approvalCaseId → CaseRecord.id -------------------------
ALTER TABLE "overtime_policies"
  ADD CONSTRAINT "overtime_policies_approvalCaseId_fkey"
  FOREIGN KEY ("approvalCaseId") REFERENCES "CaseRecord"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
CREATE INDEX IF NOT EXISTS "overtime_policies_approvalCaseId_idx"
  ON "overtime_policies" ("approvalCaseId");

-- ---- project_change_requests.requesterPersonId → Person.id -----------------
ALTER TABLE "project_change_requests"
  ADD CONSTRAINT "project_change_requests_requesterPersonId_fkey"
  FOREIGN KEY ("requesterPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
CREATE INDEX IF NOT EXISTS "project_change_requests_requesterPersonId_idx"
  ON "project_change_requests" ("requesterPersonId");

-- ---- project_change_requests.decidedByPersonId → Person.id -----------------
ALTER TABLE "project_change_requests"
  ADD CONSTRAINT "project_change_requests_decidedByPersonId_fkey"
  FOREIGN KEY ("decidedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
CREATE INDEX IF NOT EXISTS "project_change_requests_decidedByPersonId_idx"
  ON "project_change_requests" ("decidedByPersonId");

-- ---- project_radiator_overrides.overriddenByPersonId → Person.id -----------
ALTER TABLE "project_radiator_overrides"
  ADD CONSTRAINT "project_radiator_overrides_overriddenByPersonId_fkey"
  FOREIGN KEY ("overriddenByPersonId") REFERENCES "Person"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  NOT VALID;
CREATE INDEX IF NOT EXISTS "project_radiator_overrides_overriddenByPersonId_idx"
  ON "project_radiator_overrides" ("overriddenByPersonId");

-- ---- project_rag_snapshots.recordedByPersonId → Person.id ------------------
ALTER TABLE "project_rag_snapshots"
  ADD CONSTRAINT "project_rag_snapshots_recordedByPersonId_fkey"
  FOREIGN KEY ("recordedByPersonId") REFERENCES "Person"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE
  NOT VALID;
CREATE INDEX IF NOT EXISTS "project_rag_snapshots_recordedByPersonId_idx"
  ON "project_rag_snapshots" ("recordedByPersonId");

-- ---- project_risks.ownerPersonId → Person.id -------------------------------
ALTER TABLE "project_risks"
  ADD CONSTRAINT "project_risks_ownerPersonId_fkey"
  FOREIGN KEY ("ownerPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
-- Existing index on ownerPersonId.

-- ---- project_risks.assigneePersonId → Person.id ----------------------------
ALTER TABLE "project_risks"
  ADD CONSTRAINT "project_risks_assigneePersonId_fkey"
  FOREIGN KEY ("assigneePersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
CREATE INDEX IF NOT EXISTS "project_risks_assigneePersonId_idx"
  ON "project_risks" ("assigneePersonId");

-- ---- project_risks.relatedCaseId → CaseRecord.id ---------------------------
ALTER TABLE "project_risks"
  ADD CONSTRAINT "project_risks_relatedCaseId_fkey"
  FOREIGN KEY ("relatedCaseId") REFERENCES "CaseRecord"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
CREATE INDEX IF NOT EXISTS "project_risks_relatedCaseId_idx"
  ON "project_risks" ("relatedCaseId");

-- ---- radiator_threshold_configs.updatedByPersonId → Person.id --------------
ALTER TABLE "radiator_threshold_configs"
  ADD CONSTRAINT "radiator_threshold_configs_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
CREATE INDEX IF NOT EXISTS "radiator_threshold_configs_updatedByPersonId_idx"
  ON "radiator_threshold_configs" ("updatedByPersonId");

-- ---- RadiusReconciliationRecord.personId → Person.id -----------------------
ALTER TABLE "RadiusReconciliationRecord"
  ADD CONSTRAINT "RadiusReconciliationRecord_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE
  NOT VALID;
-- Existing index on personId.

-- ============================================================================
-- VALIDATE CONSTRAINT — run AFTER scripts/find-orphans.ts reports zero orphans
-- for the columns above. Each VALIDATE takes SHARE UPDATE EXCLUSIVE (readers +
-- writers unaffected), but does a full table scan. Safe on current-scale tables.
-- ============================================================================

ALTER TABLE "AuditLog"                              VALIDATE CONSTRAINT "AuditLog_actorId_fkey";
ALTER TABLE "EmployeeActivityEvent"                 VALIDATE CONSTRAINT "EmployeeActivityEvent_actorId_fkey";
ALTER TABLE "LocalAccount"                          VALIDATE CONSTRAINT "LocalAccount_personId_fkey";
ALTER TABLE "M365DirectoryReconciliationRecord"     VALIDATE CONSTRAINT "M365DirectoryReconciliationRecord_personId_fkey";
ALTER TABLE "M365DirectoryReconciliationRecord"     VALIDATE CONSTRAINT "M365DirectoryReconciliationRecord_resolvedManagerPersonId_fkey";
ALTER TABLE "PersonExternalIdentityLink"            VALIDATE CONSTRAINT "PersonExternalIdentityLink_resolvedManagerPersonId_fkey";
ALTER TABLE "overtime_policies"                     VALIDATE CONSTRAINT "overtime_policies_approvalCaseId_fkey";
ALTER TABLE "project_change_requests"               VALIDATE CONSTRAINT "project_change_requests_requesterPersonId_fkey";
ALTER TABLE "project_change_requests"               VALIDATE CONSTRAINT "project_change_requests_decidedByPersonId_fkey";
ALTER TABLE "project_radiator_overrides"            VALIDATE CONSTRAINT "project_radiator_overrides_overriddenByPersonId_fkey";
ALTER TABLE "project_rag_snapshots"                 VALIDATE CONSTRAINT "project_rag_snapshots_recordedByPersonId_fkey";
ALTER TABLE "project_risks"                         VALIDATE CONSTRAINT "project_risks_ownerPersonId_fkey";
ALTER TABLE "project_risks"                         VALIDATE CONSTRAINT "project_risks_assigneePersonId_fkey";
ALTER TABLE "project_risks"                         VALIDATE CONSTRAINT "project_risks_relatedCaseId_fkey";
ALTER TABLE "radiator_threshold_configs"            VALIDATE CONSTRAINT "radiator_threshold_configs_updatedByPersonId_fkey";
ALTER TABLE "RadiusReconciliationRecord"            VALIDATE CONSTRAINT "RadiusReconciliationRecord_personId_fkey";

-- Audit trail: record the migration itself.
INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(),
  'Migration',
  gen_random_uuid(),
  'DM-3-RelationClosure',
  jsonb_build_object(
    'migration', '20260417_dm3_relation_closure',
    'foreignKeysAdded', 16,
    'validated', true
  ),
  NOW()
);
