ALTER TABLE "Project"
ADD COLUMN "projectManagerId" UUID;

ALTER TABLE "Project"
ADD CONSTRAINT "Project_projectManagerId_fkey"
FOREIGN KEY ("projectManagerId") REFERENCES "Person"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Project_projectManagerId_idx" ON "Project"("projectManagerId");
