import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * LEAN-P2-9 — staging soak readiness.
 *
 * Surfaces daily counts that prove the lean `ProjectPosition` aggregate
 * is converging with the legacy `ProjectAssignment` + `StaffingRequest`
 * pair. The numbers feed the soak monitor + the C0 exit checklist.
 *
 * This service is read-only and admin-only. It does NOT flip the
 * `dsRefresh` / `workspaceMe` defaults — that is the C0 cutover step.
 */

export interface LeanMigrationParitySnapshot {
  /** ISO timestamp at which the snapshot was taken. */
  capturedAt: string;
  /** Total rows in the lean `ProjectPosition` aggregate. */
  projectPositionCount: number;
  /** Total rows in the legacy `ProjectAssignment` table. */
  projectAssignmentCount: number;
  /** Total rows in the legacy `staffing_requests` table. */
  staffingRequestCount: number;
  /** Positions with a non-NULL `legacyAssignmentId` back-reference. */
  positionsLinkedToAssignment: number;
  /** Positions with a non-NULL `legacyStaffingRequestId` back-reference. */
  positionsLinkedToStaffingRequest: number;
  /** Positions whose `legacyAssignmentId` does not resolve to a live `ProjectAssignment` row. */
  positionsWithOrphanedAssignmentLink: number;
  /** Positions whose `legacyStaffingRequestId` does not resolve to a live `staffing_requests` row. */
  positionsWithOrphanedStaffingRequestLink: number;
  /** Non-archived ProjectAssignment rows that have no mirroring ProjectPosition. */
  assignmentsWithoutPosition: number;
  /** staffing_requests rows that have no mirroring ProjectPosition. */
  staffingRequestsWithoutPosition: number;
  /** Convenience: assignmentsWithoutPosition + staffingRequestsWithoutPosition. */
  divergenceCount: number;
}

@Injectable()
export class LeanMigrationParityService {
  public constructor(private readonly prisma: PrismaService) {}

  public async snapshot(): Promise<LeanMigrationParitySnapshot> {
    const [
      projectPositionCount,
      projectAssignmentCount,
      staffingRequestCount,
      positionsLinkedToAssignment,
      positionsLinkedToStaffingRequest,
      positionsWithOrphanedAssignmentLink,
      positionsWithOrphanedStaffingRequestLink,
      assignmentsWithoutPosition,
      staffingRequestsWithoutPosition,
    ] = await Promise.all([
      this.prisma.projectPosition.count(),
      this.prisma.projectAssignment.count(),
      this.prisma.staffingRequest.count(),
      this.prisma.projectPosition.count({ where: { legacyAssignmentId: { not: null } } }),
      this.prisma.projectPosition.count({ where: { legacyStaffingRequestId: { not: null } } }),
      this.countScalar(
        `SELECT COUNT(*)::bigint AS n
           FROM "ProjectPosition" pp
          WHERE pp."legacyAssignmentId" IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM "ProjectAssignment" pa
               WHERE pa.id = pp."legacyAssignmentId"
            );`,
      ),
      this.countScalar(
        `SELECT COUNT(*)::bigint AS n
           FROM "ProjectPosition" pp
          WHERE pp."legacyStaffingRequestId" IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM "staffing_requests" sr
               WHERE sr.id = pp."legacyStaffingRequestId"
            );`,
      ),
      this.countScalar(
        `SELECT COUNT(*)::bigint AS n
           FROM "ProjectAssignment" pa
          WHERE pa."archivedAt" IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM "ProjectPosition" pp
               WHERE pp."legacyAssignmentId" = pa.id::uuid
            );`,
      ),
      this.countScalar(
        `SELECT COUNT(*)::bigint AS n
           FROM "staffing_requests" sr
          WHERE NOT EXISTS (
            SELECT 1 FROM "ProjectPosition" pp
             WHERE pp."legacyStaffingRequestId" = sr.id::uuid
          );`,
      ),
    ]);

    return {
      capturedAt: new Date().toISOString(),
      projectPositionCount,
      projectAssignmentCount,
      staffingRequestCount,
      positionsLinkedToAssignment,
      positionsLinkedToStaffingRequest,
      positionsWithOrphanedAssignmentLink,
      positionsWithOrphanedStaffingRequestLink,
      assignmentsWithoutPosition,
      staffingRequestsWithoutPosition,
      divergenceCount: assignmentsWithoutPosition + staffingRequestsWithoutPosition,
    };
  }

  private async countScalar(sql: string): Promise<number> {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ n: bigint | number | null }>>(sql);
    const head = rows[0]?.n ?? 0;
    return typeof head === 'bigint' ? Number(head) : head;
  }
}
