-- CreateTable
CREATE TABLE "planner_scenarios" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdByPersonId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "state" JSONB NOT NULL,
    "summaryAssignments" INTEGER NOT NULL DEFAULT 0,
    "summaryHires" INTEGER NOT NULL DEFAULT 0,
    "summaryReleases" INTEGER NOT NULL DEFAULT 0,
    "summaryExtensions" INTEGER NOT NULL DEFAULT 0,
    "summaryAnomalies" INTEGER NOT NULL DEFAULT 0,
    "horizonFrom" DATE,
    "horizonWeeks" INTEGER,

    CONSTRAINT "planner_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planner_scenarios_createdByPersonId_idx" ON "planner_scenarios"("createdByPersonId");

-- CreateIndex
CREATE INDEX "planner_scenarios_archivedAt_idx" ON "planner_scenarios"("archivedAt");

-- AddForeignKey
ALTER TABLE "planner_scenarios" ADD CONSTRAINT "planner_scenarios_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
