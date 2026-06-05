import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  CreateLeaveRequestRowInput,
  FindLeaveRequestsFilter,
  FindOverlappingApprovedInput,
  LeaveRequestRepositoryPort,
  LeaveRequestRow,
  UpdateLeaveRequestStatusInput,
} from '../../../domain/repositories/leave-request-repository.port';

/**
 * F-14.2 / 20c-02 — Prisma adapter for `LeaveRequestRepositoryPort`.
 * Encapsulates every Prisma call the application layer previously made
 * directly so `LeaveRequestsService` can rely on a port.
 */
@Injectable()
export class PrismaLeaveRequestRepository implements LeaveRequestRepositoryPort {
  public constructor(private readonly prisma: PrismaService) {}

  public async create(input: CreateLeaveRequestRowInput): Promise<LeaveRequestRow> {
    return this.prisma.leaveRequest.create({
      data: {
        endDate: input.endDate,
        notes: input.notes,
        personId: input.personId,
        startDate: input.startDate,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: input.type as any,
        // F-112 / D-103-write-path round 22 — actor-audit.
        createdByPersonId: input.actorId ?? null,
        updatedByPersonId: input.actorId ?? null,
      },
    });
  }

  public async findById(id: string): Promise<LeaveRequestRow | null> {
    return this.prisma.leaveRequest.findUnique({ where: { id } });
  }

  public async findManyByPerson(personId: string): Promise<LeaveRequestRow[]> {
    return this.prisma.leaveRequest.findMany({
      orderBy: { createdAt: 'desc' },
      where: { personId },
    });
  }

  public async findMany(filter: FindLeaveRequestsFilter): Promise<LeaveRequestRow[]> {
    return this.prisma.leaveRequest.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        ...(filter.personId ? { personId: filter.personId } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(filter.status ? { status: filter.status as any } : {}),
      },
    });
  }

  public async findFirstOverlappingApproved(
    input: FindOverlappingApprovedInput,
  ): Promise<LeaveRequestRow | null> {
    return this.prisma.leaveRequest.findFirst({
      where: {
        personId: input.personId,
        status: 'APPROVED',
        id: { not: input.excludeId },
        startDate: { lte: input.endDate },
        endDate: { gte: input.startDate },
      },
    });
  }

  public async updateStatus(
    id: string,
    input: UpdateLeaveRequestStatusInput,
  ): Promise<LeaveRequestRow> {
    return this.prisma.leaveRequest.update({
      data: {
        reviewedAt: input.reviewedAt,
        reviewedBy: input.reviewedBy,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: input.status as any,
        // F-112 / D-103-write-path round 22 — actor-audit.
        updatedByPersonId: input.actorId ?? input.reviewedBy ?? null,
        // Track B.1 — only set the column when the caller provided a value;
        // `undefined` leaves the existing value untouched (matches Prisma
        // partial-update semantics). `null` explicitly clears it.
        ...(input.reviewComment !== undefined ? { reviewComment: input.reviewComment } : {}),
      },
      where: { id },
    });
  }
}
