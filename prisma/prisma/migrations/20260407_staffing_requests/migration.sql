-- Supply & Demand: Staffing Requests (Phase 13)

CREATE TYPE "StaffingRequestStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_REVIEW', 'FULFILLED', 'CANCELLED');
CREATE TYPE "StaffingRequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE "staffing_requests" (
  "id"                  TEXT NOT NULL,
  "projectId"           TEXT NOT NULL,
  "requestedByPersonId" TEXT NOT NULL,
  "role"                TEXT NOT NULL,
  "skills"              TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "summary"             TEXT,
  "allocationPercent"   INTEGER NOT NULL,
  "headcountRequired"   INTEGER NOT NULL DEFAULT 1,
  "headcountFulfilled"  INTEGER NOT NULL DEFAULT 0,
  "priority"            "StaffingRequestPriority" NOT NULL DEFAULT 'MEDIUM',
  "status"              "StaffingRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "startDate"           DATE NOT NULL,
  "endDate"             DATE NOT NULL,
  "cancelledAt"         TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "staffing_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "staffing_requests_projectId_status_idx" ON "staffing_requests"("projectId", "status");
CREATE INDEX "staffing_requests_requestedByPersonId_status_idx" ON "staffing_requests"("requestedByPersonId", "status");
CREATE INDEX "staffing_requests_status_priority_startDate_idx" ON "staffing_requests"("status", "priority", "startDate");

CREATE TABLE "staffing_request_fulfilments" (
  "id"                  TEXT NOT NULL,
  "requestId"           TEXT NOT NULL,
  "assignedPersonId"    TEXT NOT NULL,
  "proposedByPersonId"  TEXT NOT NULL,
  "fulfilledAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staffing_request_fulfilments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staffing_request_fulfilments_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "staffing_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "staffing_request_fulfilments_requestId_idx" ON "staffing_request_fulfilments"("requestId");
CREATE INDEX "staffing_request_fulfilments_assignedPersonId_idx" ON "staffing_request_fulfilments"("assignedPersonId");
