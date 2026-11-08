-- AlterEnum
-- DM-R-11 (2026-04-18): these are IF NOT EXISTS because an earlier migration
-- (20260408_leave_requests) was retroactively edited to pre-include PARENTAL
-- in its CREATE TYPE. Fresh-DB replay would fail on duplicate enum label
-- without this idempotence. The applied DB state is unchanged.
ALTER TYPE "LeaveRequestType" ADD VALUE IF NOT EXISTS 'OT_OFF';
ALTER TYPE "LeaveRequestType" ADD VALUE IF NOT EXISTS 'PERSONAL';
ALTER TYPE "LeaveRequestType" ADD VALUE IF NOT EXISTS 'PARENTAL';
ALTER TYPE "LeaveRequestType" ADD VALUE IF NOT EXISTS 'BEREAVEMENT';
ALTER TYPE "LeaveRequestType" ADD VALUE IF NOT EXISTS 'STUDY';

-- AlterTable
ALTER TABLE "timesheet_entries" ADD COLUMN     "benchCategory" TEXT;

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "leaveType" "LeaveRequestType" NOT NULL,
    "entitlement" DECIMAL(5,1) NOT NULL,
    "used" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "pending" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_holidays" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'AU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_balances_personId_year_idx" ON "leave_balances"("personId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_personId_year_leaveType_key" ON "leave_balances"("personId", "year", "leaveType");

-- CreateIndex
CREATE INDEX "public_holidays_countryCode_date_idx" ON "public_holidays"("countryCode", "date");

-- CreateIndex
CREATE UNIQUE INDEX "public_holidays_date_countryCode_key" ON "public_holidays"("date", "countryCode");

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
