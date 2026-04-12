CREATE TABLE "skills" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

CREATE TABLE "person_skills" (
  "id" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "proficiency" INTEGER NOT NULL,
  "certified" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "person_skills_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "person_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "person_skills_personId_skillId_key" ON "person_skills"("personId", "skillId");
