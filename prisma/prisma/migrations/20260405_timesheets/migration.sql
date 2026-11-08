CREATE TYPE "TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

CREATE TABLE "timesheet_weeks" (
  "id" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "weekStart" DATE NOT NULL,
  "status" "TimesheetStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "timesheet_weeks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "timesheet_weeks_personId_weekStart_key" ON "timesheet_weeks"("personId", "weekStart");

CREATE TABLE "timesheet_entries" (
  "id" TEXT NOT NULL,
  "timesheetWeekId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "assignmentId" TEXT,
  "date" DATE NOT NULL,
  "hours" DECIMAL(5,2) NOT NULL,
  "capex" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "timesheet_entries_timesheetWeekId_projectId_date_key" ON "timesheet_entries"("timesheetWeekId", "projectId", "date");

ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_timesheetWeekId_fkey"
  FOREIGN KEY ("timesheetWeekId") REFERENCES "timesheet_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
