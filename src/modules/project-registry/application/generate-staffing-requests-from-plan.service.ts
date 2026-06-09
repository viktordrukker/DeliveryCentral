import { Injectable } from '@nestjs/common';
import { StaffingRequestStatus } from '@prisma/client';

import { mapStaffingRequestStatusToFillStatus } from '@src/shared/lean-migration/enum-mappings';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectRolePlanService } from './project-role-plan.service';

export interface GenerateRequestsResult {
  createdRequestIds: string[];
  skippedCount: number;
  totalGaps: number;
}

/**
 * LEAN-P1-10 (V2 Master Plan Phase 1) — dual-write migration of the
 * "generate staffing requests from role plan" flow onto the lean
 * `ProjectPosition` aggregate.
 *
 * Strategy:
 *  - Canonical write: one `ProjectPosition` row per headcount gap unit
 *    (`fillStatus=OPEN`). 1 plan request with `headcount=5` fans out to
 *    5 ProjectPosition rows, matching the per-position lean model.
 *  - Legacy follower write: one matching `StaffingRequest` row per
 *    headcount unit (`headcountRequired=1`), preserving byte-identical
 *    behaviour for legacy readers (see audit at
 *    `docs/planning/lean-data-shape-audit.md` — the bulk of SR readers
 *    haven't been migrated yet). The legacy row is created **before**
 *    the position so the new row's `legacyStaffingRequestId` can carry
 *    provenance back to the SR (matching the Sprint-2 backfill shape).
 *  - Status mapping via `mapStaffingRequestStatusToFillStatus` (LEAN-P0-2)
 *    — `OPEN → ProjectPositionFillStatus.OPEN` is the 1:1 case used here.
 *  - D-103 actor-audit: `createdByPersonId` and `updatedByPersonId` on
 *    both rows from `requestedByPersonId`.
 *  - Return contract preserved: `createdRequestIds` continues to expose
 *    the legacy `StaffingRequest.id` values so existing callers (HTTP
 *    consumers, frontend, follow-up flows) keep working unchanged.
 */
@Injectable()
export class GenerateStaffingRequestsFromPlanService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly rolePlanService: ProjectRolePlanService,
  ) {}

  public async execute(projectId: string, requestedByPersonId: string): Promise<GenerateRequestsResult> {
    const comparison = await this.rolePlanService.getRolePlanVsActual(projectId);
    const rolePlan = await this.rolePlanService.getRolePlan(projectId);

    const createdRequestIds: string[] = [];
    let skippedCount = 0;
    let totalGaps = 0;

    // LEAN-P1-10 — the lean canonical fillStatus for a freshly-generated
    // demand row. `StaffingRequest.status='OPEN'` collapses 1:1 onto
    // `ProjectPositionFillStatus.OPEN` per the LEAN-P0-2 helper.
    const initialFillStatus = mapStaffingRequestStatusToFillStatus(StaffingRequestStatus.OPEN);

    for (const row of comparison.rows) {
      if (row.gap <= 0) continue;
      totalGaps += row.gap;

      const planEntry = rolePlan.find(
        (e) => e.roleName === row.roleName && e.seniorityLevel === row.seniorityLevel,
      );
      if (!planEntry) { skippedCount++; continue; }

      // SoT PR 14b — dedupe check now sources from canonical `ProjectPosition`
      // (`fillStatus in DRAFT/OPEN/PROPOSED`) instead of the legacy
      // `StaffingRequest` table. `OPEN/PROPOSED` map 1:1 from the legacy
      // `DRAFT/OPEN/IN_REVIEW` set per `mapStaffingRequestStatusToFillStatus`
      // (DRAFT collapses onto DRAFT, OPEN onto OPEN, IN_REVIEW onto PROPOSED).
      const existingPosition = await this.prisma.projectPosition.findFirst({
        where: {
          projectId,
          role: row.roleName,
          fillStatus: { in: ['DRAFT', 'OPEN', 'PROPOSED'] },
        },
      });

      if (existingPosition) {
        skippedCount++;
        continue;
      }

      const allocationPercent = planEntry.allocationPercent ?? 100;
      const startDate = planEntry.plannedStartDate ? new Date(planEntry.plannedStartDate) : new Date();
      const endDate = planEntry.plannedEndDate ? new Date(planEntry.plannedEndDate) : new Date('2099-12-31');
      const summary = `Auto-generated from role plan: ${row.roleName}${row.seniorityLevel ? ` (${row.seniorityLevel})` : ''}`;
      const skills = planEntry.requiredSkillIds;

      // Create staffing request for each gap unit. Legacy follower SR is
      // written first so the canonical `ProjectPosition` can carry the SR
      // id back as `legacyStaffingRequestId` provenance (matches the
      // Sprint-2 backfill shape and keeps `lean-readiness-check.ts`
      // probe #2/#5 green for new rows).
      for (let i = 0; i < row.gap; i++) {
        const created = await this.prisma.$transaction(async (tx) => {
          const request = await tx.staffingRequest.create({
            data: {
              projectId,
              requestedByPersonId,
              role: row.roleName,
              skills,
              allocationPercent,
              startDate,
              endDate,
              headcountRequired: 1,
              headcountFulfilled: 0,
              priority: 'MEDIUM',
              status: 'OPEN',
              summary,
              // F-128 / D-103-write-path round 38 — generator-driven, the
              // role-plan submitter is the canonical actor for the auto-created SR.
              createdByPersonId: requestedByPersonId,
              updatedByPersonId: requestedByPersonId,
            },
          });

          // LEAN-P1-10 — canonical lean write. One ProjectPosition per
          // headcount gap unit (fan-out 1:1 because each legacy SR is
          // also created with `headcountRequired=1` above).
          await tx.projectPosition.create({
            data: {
              projectId,
              role: row.roleName,
              skills,
              summary,
              requiredAllocationPercent: allocationPercent.toString(),
              startDate,
              endDate,
              priority: 'MEDIUM',
              requestedByPersonId,
              fillStatus: initialFillStatus,
              // D-103 actor-audit: thread the role-plan submitter through
              // as the canonical actor (matches the legacy SR row above).
              createdByPersonId: requestedByPersonId,
              updatedByPersonId: requestedByPersonId,
              // Provenance pointer back to the legacy follower so the
              // readiness probes (`legacyStaffingRequestId` heads) keep
              // working post-Phase-1. `request.idNew` is the uuid-typed
              // counterpart of `request.id` (DM-2 dual-id; see audit doc).
              legacyStaffingRequestId: request.idNew,
            },
          });

          return request;
        });

        createdRequestIds.push(created.id);
      }
    }

    return { createdRequestIds, skippedCount, totalGaps };
  }
}
