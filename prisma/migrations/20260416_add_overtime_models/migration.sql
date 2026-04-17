-- AlterTable
ALTER TABLE "timesheet_weeks" ADD COLUMN     "overtimeApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overtimeHours" DECIMAL(5,2),
ADD COLUMN     "overtimeThreshold" INTEGER,
ADD COLUMN     "standardHours" DECIMAL(5,2),
ADD COLUMN     "totalHours" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "overtime_policies" (
    "id" UUID NOT NULL,
    "orgUnitId" UUID,
    "resourcePoolId" UUID,
    "standardHoursPerWeek" INTEGER NOT NULL,
    "maxOvertimeHoursPerWeek" INTEGER NOT NULL,
    "setByPersonId" UUID NOT NULL,
    "approvalCaseId" UUID,
    "approvalStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime_exceptions" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "caseRecordId" UUID NOT NULL,
    "maxOvertimeHoursPerWeek" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "overtime_policies_orgUnitId_effectiveFrom_idx" ON "overtime_policies"("orgUnitId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "overtime_policies_resourcePoolId_effectiveFrom_idx" ON "overtime_policies"("resourcePoolId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "overtime_exceptions_personId_effectiveFrom_effectiveTo_idx" ON "overtime_exceptions"("personId", "effectiveFrom", "effectiveTo");

-- AddForeignKey
ALTER TABLE "overtime_policies" ADD CONSTRAINT "overtime_policies_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_policies" ADD CONSTRAINT "overtime_policies_resourcePoolId_fkey" FOREIGN KEY ("resourcePoolId") REFERENCES "ResourcePool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_policies" ADD CONSTRAINT "overtime_policies_setByPersonId_fkey" FOREIGN KEY ("setByPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_exceptions" ADD CONSTRAINT "overtime_exceptions_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_exceptions" ADD CONSTRAINT "overtime_exceptions_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES "CaseRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
