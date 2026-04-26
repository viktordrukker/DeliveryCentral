-- ============================================================================
-- DM-4-1 · CHECK constraints — data-quality guardrails at the DB level
-- ============================================================================
-- Per strategic plan §B.5 / DMD-018 / schema-conventions.md.
--
-- Pattern: every constraint is added with NOT VALID so the transaction is
-- metadata-only (no table rewrite, no row scan, milliseconds). A follow-up
-- VALIDATE CONSTRAINT in THIS migration forces a SHARE UPDATE EXCLUSIVE
-- table scan. If a scan fails (existing row violates the constraint) the
-- whole migration rolls back — fix data, re-run.
--
-- Constraints kept ATOMIC to ensure no partial application. At DeliveryCentral's
-- current row counts (<100k across the affected tables) the full validate
-- completes well under the 30s statement_timeout.
-- ============================================================================

SET LOCAL lock_timeout       = '3s';
SET LOCAL statement_timeout  = '30s';

-- ------------------------------------------------------------------ Ranges
-- allocationPercent ∈ [0,100]
ALTER TABLE "ProjectAssignment"
  ADD CONSTRAINT "ProjectAssignment_allocationPercent_range_check"
  CHECK ("allocationPercent" IS NULL OR ("allocationPercent" >= 0 AND "allocationPercent" <= 100))
  NOT VALID;

ALTER TABLE "staffing_requests"
  ADD CONSTRAINT "staffing_requests_allocationPercent_range_check"
  CHECK ("allocationPercent" >= 0 AND "allocationPercent" <= 100)
  NOT VALID;

ALTER TABLE "project_role_plans"
  ADD CONSTRAINT "project_role_plans_allocationPercent_range_check"
  CHECK ("allocationPercent" IS NULL OR ("allocationPercent" >= 0 AND "allocationPercent" <= 100))
  NOT VALID;

-- proficiency ∈ [1,5]
ALTER TABLE "person_skills"
  ADD CONSTRAINT "person_skills_proficiency_range_check"
  CHECK ("proficiency" >= 1 AND "proficiency" <= 5)
  NOT VALID;

-- mood ∈ [1,5]
ALTER TABLE "pulse_entries"
  ADD CONSTRAINT "pulse_entries_mood_range_check"
  CHECK ("mood" >= 1 AND "mood" <= 5)
  NOT VALID;

-- probability / impact ∈ [1,5]
ALTER TABLE "project_risks"
  ADD CONSTRAINT "project_risks_probability_range_check"
  CHECK ("probability" >= 1 AND "probability" <= 5)
  NOT VALID;

ALTER TABLE "project_risks"
  ADD CONSTRAINT "project_risks_impact_range_check"
  CHECK ("impact" >= 1 AND "impact" <= 5)
  NOT VALID;

-- ------------------------------------------------------------ Non-negative
-- headcount > 0 (at least one seat)
ALTER TABLE "staffing_requests"
  ADD CONSTRAINT "staffing_requests_headcountRequired_positive_check"
  CHECK ("headcountRequired" >= 1)
  NOT VALID;

ALTER TABLE "staffing_requests"
  ADD CONSTRAINT "staffing_requests_headcountFulfilled_nonnegative_check"
  CHECK ("headcountFulfilled" >= 0 AND "headcountFulfilled" <= "headcountRequired")
  NOT VALID;

ALTER TABLE "project_role_plans"
  ADD CONSTRAINT "project_role_plans_headcount_positive_check"
  CHECK ("headcount" >= 1)
  NOT VALID;

ALTER TABLE "project_vendor_engagements"
  ADD CONSTRAINT "project_vendor_engagements_headcount_positive_check"
  CHECK ("headcount" >= 1)
  NOT VALID;

-- Hours + thresholds non-negative
ALTER TABLE "timesheet_entries"
  ADD CONSTRAINT "timesheet_entries_hours_nonnegative_check"
  CHECK ("hours" >= 0 AND "hours" <= 24)
  NOT VALID;

ALTER TABLE "timesheet_weeks"
  ADD CONSTRAINT "timesheet_weeks_totalHours_nonnegative_check"
  CHECK ("totalHours" IS NULL OR "totalHours" >= 0)
  NOT VALID;

ALTER TABLE "timesheet_weeks"
  ADD CONSTRAINT "timesheet_weeks_standardHours_nonnegative_check"
  CHECK ("standardHours" IS NULL OR "standardHours" >= 0)
  NOT VALID;

ALTER TABLE "timesheet_weeks"
  ADD CONSTRAINT "timesheet_weeks_overtimeHours_nonnegative_check"
  CHECK ("overtimeHours" IS NULL OR "overtimeHours" >= 0)
  NOT VALID;

ALTER TABLE "overtime_policies"
  ADD CONSTRAINT "overtime_policies_standardHoursPerWeek_nonnegative_check"
  CHECK ("standardHoursPerWeek" >= 0 AND "standardHoursPerWeek" <= 168)
  NOT VALID;

ALTER TABLE "overtime_policies"
  ADD CONSTRAINT "overtime_policies_maxOvertimeHoursPerWeek_nonnegative_check"
  CHECK ("maxOvertimeHoursPerWeek" >= 0 AND "maxOvertimeHoursPerWeek" <= 168)
  NOT VALID;

ALTER TABLE "overtime_exceptions"
  ADD CONSTRAINT "overtime_exceptions_maxOvertimeHoursPerWeek_nonnegative_check"
  CHECK ("maxOvertimeHoursPerWeek" >= 0 AND "maxOvertimeHoursPerWeek" <= 168)
  NOT VALID;

-- Monetary non-negative
ALTER TABLE "project_budgets"
  ADD CONSTRAINT "project_budgets_capexBudget_nonnegative_check"
  CHECK ("capexBudget" >= 0)
  NOT VALID;

ALTER TABLE "project_budgets"
  ADD CONSTRAINT "project_budgets_opexBudget_nonnegative_check"
  CHECK ("opexBudget" >= 0)
  NOT VALID;

ALTER TABLE "person_cost_rates"
  ADD CONSTRAINT "person_cost_rates_hourlyRate_positive_check"
  CHECK ("hourlyRate" > 0)
  NOT VALID;

-- ------------------------------------------------------------- Date ranges
-- validFrom <= validTo where validTo is present
ALTER TABLE "ProjectAssignment"
  ADD CONSTRAINT "ProjectAssignment_validFrom_before_validTo_check"
  CHECK ("validTo" IS NULL OR "validFrom" <= "validTo")
  NOT VALID;

ALTER TABLE "Position"
  ADD CONSTRAINT "Position_validFrom_before_validTo_check"
  CHECK ("validTo" IS NULL OR "validFrom" <= "validTo")
  NOT VALID;

ALTER TABLE "ReportingLine"
  ADD CONSTRAINT "ReportingLine_validFrom_before_validTo_check"
  CHECK ("validTo" IS NULL OR "validFrom" <= "validTo")
  NOT VALID;

ALTER TABLE "PersonOrgMembership"
  ADD CONSTRAINT "PersonOrgMembership_validFrom_before_validTo_check"
  CHECK ("validTo" IS NULL OR "validFrom" <= "validTo")
  NOT VALID;

ALTER TABLE "PersonResourcePoolMembership"
  ADD CONSTRAINT "PersonResourcePoolMembership_validFrom_before_validTo_check"
  CHECK ("validTo" IS NULL OR "validFrom" <= "validTo")
  NOT VALID;

ALTER TABLE "OrgUnit"
  ADD CONSTRAINT "OrgUnit_validFrom_before_validTo_check"
  CHECK ("validTo" IS NULL OR "validFrom" <= "validTo")
  NOT VALID;

-- effectiveFrom <= effectiveTo (pre-DM-5 legacy temporal names)
ALTER TABLE "overtime_policies"
  ADD CONSTRAINT "overtime_policies_effective_range_check"
  CHECK ("effectiveTo" IS NULL OR "effectiveFrom" <= "effectiveTo")
  NOT VALID;

ALTER TABLE "overtime_exceptions"
  ADD CONSTRAINT "overtime_exceptions_effective_range_check"
  CHECK ("effectiveFrom" <= "effectiveTo")
  NOT VALID;

-- startDate <= endDate
ALTER TABLE "leave_requests"
  ADD CONSTRAINT "leave_requests_startDate_before_endDate_check"
  CHECK ("startDate" <= "endDate")
  NOT VALID;

ALTER TABLE "staffing_requests"
  ADD CONSTRAINT "staffing_requests_startDate_before_endDate_check"
  CHECK ("startDate" <= "endDate")
  NOT VALID;

ALTER TABLE "project_vendor_engagements"
  ADD CONSTRAINT "project_vendor_engagements_dateRange_check"
  CHECK ("endDate" IS NULL OR "startDate" IS NULL OR "startDate" <= "endDate")
  NOT VALID;

-- periodFrom <= periodTo
ALTER TABLE "period_locks"
  ADD CONSTRAINT "period_locks_period_range_check"
  CHECK ("periodFrom" <= "periodTo")
  NOT VALID;

-- Project lifecycle range
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_startsOn_before_endsOn_check"
  CHECK ("endsOn" IS NULL OR "startsOn" IS NULL OR "startsOn" <= "endsOn")
  NOT VALID;

-- ============================================================================
-- VALIDATE CONSTRAINT — scans each table once. Atomic with the NOT VALIDs
-- above. Safe-but-slow on tables with millions of rows; at our scale fast.
-- ============================================================================

ALTER TABLE "ProjectAssignment"            VALIDATE CONSTRAINT "ProjectAssignment_allocationPercent_range_check";
ALTER TABLE "staffing_requests"            VALIDATE CONSTRAINT "staffing_requests_allocationPercent_range_check";
ALTER TABLE "project_role_plans"           VALIDATE CONSTRAINT "project_role_plans_allocationPercent_range_check";
ALTER TABLE "person_skills"                VALIDATE CONSTRAINT "person_skills_proficiency_range_check";
ALTER TABLE "pulse_entries"                VALIDATE CONSTRAINT "pulse_entries_mood_range_check";
ALTER TABLE "project_risks"                VALIDATE CONSTRAINT "project_risks_probability_range_check";
ALTER TABLE "project_risks"                VALIDATE CONSTRAINT "project_risks_impact_range_check";
ALTER TABLE "staffing_requests"            VALIDATE CONSTRAINT "staffing_requests_headcountRequired_positive_check";
ALTER TABLE "staffing_requests"            VALIDATE CONSTRAINT "staffing_requests_headcountFulfilled_nonnegative_check";
ALTER TABLE "project_role_plans"           VALIDATE CONSTRAINT "project_role_plans_headcount_positive_check";
ALTER TABLE "project_vendor_engagements"   VALIDATE CONSTRAINT "project_vendor_engagements_headcount_positive_check";
ALTER TABLE "timesheet_entries"            VALIDATE CONSTRAINT "timesheet_entries_hours_nonnegative_check";
ALTER TABLE "timesheet_weeks"              VALIDATE CONSTRAINT "timesheet_weeks_totalHours_nonnegative_check";
ALTER TABLE "timesheet_weeks"              VALIDATE CONSTRAINT "timesheet_weeks_standardHours_nonnegative_check";
ALTER TABLE "timesheet_weeks"              VALIDATE CONSTRAINT "timesheet_weeks_overtimeHours_nonnegative_check";
ALTER TABLE "overtime_policies"            VALIDATE CONSTRAINT "overtime_policies_standardHoursPerWeek_nonnegative_check";
ALTER TABLE "overtime_policies"            VALIDATE CONSTRAINT "overtime_policies_maxOvertimeHoursPerWeek_nonnegative_check";
ALTER TABLE "overtime_exceptions"          VALIDATE CONSTRAINT "overtime_exceptions_maxOvertimeHoursPerWeek_nonnegative_check";
ALTER TABLE "project_budgets"              VALIDATE CONSTRAINT "project_budgets_capexBudget_nonnegative_check";
ALTER TABLE "project_budgets"              VALIDATE CONSTRAINT "project_budgets_opexBudget_nonnegative_check";
ALTER TABLE "person_cost_rates"            VALIDATE CONSTRAINT "person_cost_rates_hourlyRate_positive_check";
ALTER TABLE "ProjectAssignment"            VALIDATE CONSTRAINT "ProjectAssignment_validFrom_before_validTo_check";
ALTER TABLE "Position"                     VALIDATE CONSTRAINT "Position_validFrom_before_validTo_check";
ALTER TABLE "ReportingLine"                VALIDATE CONSTRAINT "ReportingLine_validFrom_before_validTo_check";
ALTER TABLE "PersonOrgMembership"          VALIDATE CONSTRAINT "PersonOrgMembership_validFrom_before_validTo_check";
ALTER TABLE "PersonResourcePoolMembership" VALIDATE CONSTRAINT "PersonResourcePoolMembership_validFrom_before_validTo_check";
ALTER TABLE "OrgUnit"                      VALIDATE CONSTRAINT "OrgUnit_validFrom_before_validTo_check";
ALTER TABLE "overtime_policies"            VALIDATE CONSTRAINT "overtime_policies_effective_range_check";
ALTER TABLE "overtime_exceptions"          VALIDATE CONSTRAINT "overtime_exceptions_effective_range_check";
ALTER TABLE "leave_requests"               VALIDATE CONSTRAINT "leave_requests_startDate_before_endDate_check";
ALTER TABLE "staffing_requests"            VALIDATE CONSTRAINT "staffing_requests_startDate_before_endDate_check";
ALTER TABLE "project_vendor_engagements"   VALIDATE CONSTRAINT "project_vendor_engagements_dateRange_check";
ALTER TABLE "period_locks"                 VALIDATE CONSTRAINT "period_locks_period_range_check";
ALTER TABLE "Project"                      VALIDATE CONSTRAINT "Project_startsOn_before_endsOn_check";

-- Audit trail for the migration itself.
INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(),
  'Migration',
  gen_random_uuid(),
  'DM-4-1-CheckConstraints',
  jsonb_build_object(
    'migration', '20260418_dm4_check_constraints',
    'constraintsAdded', 33
  ),
  NOW()
);
