import type {
  Prisma,
  ProjectPosition as PrismaProjectPosition,
  ProjectPositionFillStatus as PrismaProjectPositionFillStatus,
} from '@prisma/client';

import { ProjectPosition } from '@src/modules/project-positions/domain/entities/project-position.entity';
import { PositionId } from '@src/modules/project-positions/domain/value-objects/position-id';
import {
  PositionFillStatus,
  type PositionFillStatusValue,
} from '@src/modules/project-positions/domain/value-objects/position-fill-status';

/**
 * Bidirectional mapper between the Prisma row and the domain aggregate.
 * Pattern mirrors `assignments-prisma.mapper.ts`.
 */
export class ProjectPositionPrismaMapper {
  public static toDomain(row: PrismaProjectPosition): ProjectPosition {
    return ProjectPosition.create(
      {
        projectId: row.projectId,
        role: row.role,
        requiredAllocationPercent: Number(row.requiredAllocationPercent),
        startDate: row.startDate,
        endDate: row.endDate,
        fillStatus: PositionFillStatus.from(row.fillStatus as PositionFillStatusValue),
        activePersonId: row.activePersonId ?? undefined,
        activeAllocationPercent:
          row.activeAllocationPercent === null ? undefined : Number(row.activeAllocationPercent),
        activeValidFrom: row.activeValidFrom ?? undefined,
        activeValidTo: row.activeValidTo ?? undefined,
        releaseReason: row.releaseReason ?? undefined,
        rejectionReason: row.rejectionReason ?? undefined,
        cancellationReason: row.cancellationReason ?? undefined,
        onHoldReason: row.onHoldReason ?? undefined,
        onHoldCaseId: row.onHoldCaseId ?? undefined,
        requestedByPersonId: row.requestedByPersonId ?? undefined,
        createdByPersonId: row.createdByPersonId ?? undefined,
        updatedByPersonId: row.updatedByPersonId ?? undefined,
        version: row.version,
      },
      PositionId.from(row.id),
    );
  }

  public static toPersistence(
    aggregate: ProjectPosition,
  ): Prisma.ProjectPositionUncheckedCreateInput {
    const snap = aggregate.snapshot();
    return {
      id: aggregate.positionId.value,
      projectId: aggregate.projectId,
      role: aggregate.role,
      requiredAllocationPercent: aggregate.requiredAllocationPercent.toString(),
      // Note: domain entity holds startDate/endDate but they're not exposed on
      // the entity getters — the create service supplies them on save. For now
      // the adapter reads them from the snapshot extension below.
      startDate: (aggregate as unknown as { props: { startDate: Date } }).props.startDate,
      endDate: (aggregate as unknown as { props: { endDate: Date } }).props.endDate,
      fillStatus: snap.status as PrismaProjectPositionFillStatus,
      activePersonId: snap.activePersonId ?? null,
      activeAllocationPercent:
        snap.activeAllocationPercent !== undefined
          ? snap.activeAllocationPercent.toString()
          : null,
      activeValidFrom: snap.activeValidFrom ?? null,
      activeValidTo: snap.activeValidTo ?? null,
      releaseReason: aggregate.releaseReason ?? null,
      onHoldReason: aggregate.onHoldReason ?? null,
      onHoldCaseId: aggregate.onHoldCaseId ?? null,
      requestedByPersonId: (aggregate as unknown as { props: { requestedByPersonId?: string } }).props
        .requestedByPersonId ?? null,
      createdByPersonId: aggregate.createdByPersonId ?? null,
      updatedByPersonId: aggregate.updatedByPersonId ?? null,
      version: aggregate.version,
    };
  }
}
