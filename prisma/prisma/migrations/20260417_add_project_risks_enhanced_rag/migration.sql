-- CreateEnum
CREATE TYPE "RiskType" AS ENUM ('RISK', 'ISSUE');
CREATE TYPE "RiskCategory" AS ENUM ('SCOPE', 'SCHEDULE', 'BUDGET', 'BUSINESS', 'TECHNICAL', 'OPERATIONAL');
CREATE TYPE "RiskStrategy" AS ENUM ('MITIGATE', 'ACCEPT', 'TRANSFER', 'AVOID', 'ESCALATE');
CREATE TYPE "RiskStatus" AS ENUM ('IDENTIFIED', 'ASSESSED', 'MITIGATING', 'RESOLVED', 'CLOSED', 'CONVERTED_TO_ISSUE');

-- AlterTable: ProjectRagSnapshot - add new columns
ALTER TABLE "project_rag_snapshots" ADD COLUMN "scopeRag" "RagRating";
ALTER TABLE "project_rag_snapshots" ADD COLUMN "businessRag" "RagRating";
ALTER TABLE "project_rag_snapshots" ADD COLUMN "dimensionDetails" JSONB;
ALTER TABLE "project_rag_snapshots" ADD COLUMN "riskSummary" TEXT;

-- CreateTable: ProjectRisk
CREATE TABLE "project_risks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "RiskCategory" NOT NULL,
    "riskType" "RiskType" NOT NULL DEFAULT 'RISK',
    "probability" INTEGER NOT NULL DEFAULT 3,
    "impact" INTEGER NOT NULL DEFAULT 3,
    "strategy" "RiskStrategy",
    "strategyDescription" TEXT,
    "damageControlPlan" TEXT,
    "status" "RiskStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "ownerPersonId" UUID,
    "assigneePersonId" UUID,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "convertedFromRiskId" UUID,
    "relatedCaseId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_risks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_risks_projectId_status_idx" ON "project_risks"("projectId", "status");
CREATE INDEX "project_risks_projectId_riskType_idx" ON "project_risks"("projectId", "riskType");
CREATE INDEX "project_risks_ownerPersonId_idx" ON "project_risks"("ownerPersonId");

-- AddForeignKey
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_convertedFromRiskId_fkey" FOREIGN KEY ("convertedFromRiskId") REFERENCES "project_risks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
