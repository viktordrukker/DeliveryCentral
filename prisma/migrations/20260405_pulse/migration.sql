CREATE TABLE "pulse_entries" (
  "id" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "weekStart" DATE NOT NULL,
  "mood" INTEGER NOT NULL,
  "note" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pulse_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pulse_entries_personId_weekStart_key" ON "pulse_entries"("personId", "weekStart");
