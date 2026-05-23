import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  LEAVE_REQUEST_REPOSITORY,
  LeaveRequestRepositoryPort,
  LeaveRequestRow,
} from '../domain/repositories/leave-request-repository.port';

export interface CreateLeaveRequestDto {
  endDate: string;
  notes?: string;
  personId: string;
  startDate: string;
  type: 'ANNUAL' | 'SICK' | 'OTHER';
  // F-112 / D-103-write-path round 22 — actor for createdBy/updatedBy.
  actorId?: string;
}

export interface LeaveRequestDto {
  createdAt: string;
  endDate: string;
  id: string;
  notes: string | null;
  personId: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  // Track B.1 — reviewer's justification surfaced in audit / decision drawer.
  reviewComment: string | null;
  startDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  type: 'ANNUAL' | 'SICK' | 'OTHER';
}

/**
 * F-14.2 / 20c-02 — service now consumes `LeaveRequestRepositoryPort`
 * instead of `PrismaService` directly. Repository pattern restored;
 * Prisma row-shape leakage stops at the port boundary.
 */
@Injectable()
export class LeaveRequestsService {
  public constructor(
    @Inject(LEAVE_REQUEST_REPOSITORY)
    private readonly repository: LeaveRequestRepositoryPort,
  ) {}

  public async create(dto: CreateLeaveRequestDto): Promise<LeaveRequestDto> {
    const record = await this.repository.create({
      endDate: new Date(dto.endDate),
      notes: dto.notes ?? null,
      personId: dto.personId,
      startDate: new Date(dto.startDate),
      type: dto.type,
      // F-112 / D-103-write-path round 22 — default to the subject when
      // no explicit actor (self-serve submission).
      actorId: dto.actorId ?? dto.personId,
    });
    return this.toDto(record);
  }

  public async findMy(personId: string): Promise<LeaveRequestDto[]> {
    const records = await this.repository.findManyByPerson(personId);
    return records.map((r) => this.toDto(r));
  }

  public async findAll(personId?: string, status?: string): Promise<LeaveRequestDto[]> {
    const records = await this.repository.findMany({ personId, status });
    return records.map((r) => this.toDto(r));
  }

  public async approve(
    id: string,
    reviewerId: string,
    // Track B.1 — optional approval comment, symmetric with reject().
    reviewComment?: string | null,
  ): Promise<LeaveRequestDto> {
    const record = await this.repository.findById(id);
    if (!record) throw new NotFoundException('Leave request not found');
    if (record.status !== 'PENDING') {
      throw new ForbiddenException('Only pending requests can be approved');
    }

    // Check for overlapping approved leave requests (20b-11).
    const overlapping = await this.repository.findFirstOverlappingApproved({
      personId: record.personId,
      startDate: record.startDate,
      endDate: record.endDate,
      excludeId: id,
    });
    if (overlapping) {
      throw new ForbiddenException(
        `Overlapping approved leave exists (${overlapping.startDate.toISOString().slice(0, 10)} – ${overlapping.endDate.toISOString().slice(0, 10)}).`,
      );
    }

    const updated = await this.repository.updateStatus(id, {
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      status: 'APPROVED',
      // F-112 / D-103-write-path round 22 — actor-audit.
      actorId: reviewerId,
      reviewComment: normaliseReviewComment(reviewComment),
    });
    return this.toDto(updated);
  }

  public async reject(
    id: string,
    reviewerId: string,
    // Track B.1 — optional rejection justification. Trimmed; empty → null.
    reviewComment?: string | null,
  ): Promise<LeaveRequestDto> {
    const record = await this.repository.findById(id);
    if (!record) throw new NotFoundException('Leave request not found');
    if (record.status !== 'PENDING') {
      throw new ForbiddenException('Only pending requests can be rejected');
    }
    const normalisedComment = normaliseReviewComment(reviewComment);
    const updated = await this.repository.updateStatus(id, {
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      status: 'REJECTED',
      // F-112 / D-103-write-path round 22 — actor-audit.
      actorId: reviewerId,
      reviewComment: normalisedComment,
    });
    return this.toDto(updated);
  }

  private toDto(record: LeaveRequestRow): LeaveRequestDto {
    return {
      createdAt: record.createdAt.toISOString(),
      endDate: record.endDate.toISOString().slice(0, 10),
      id: record.id,
      notes: record.notes,
      personId: record.personId,
      reviewedAt: record.reviewedAt?.toISOString() ?? null,
      reviewedBy: record.reviewedBy,
      reviewComment: record.reviewComment,
      startDate: record.startDate.toISOString().slice(0, 10),
      status: record.status as 'PENDING' | 'APPROVED' | 'REJECTED',
      type: record.type as 'ANNUAL' | 'SICK' | 'OTHER',
    };
  }
}

// Track B.1 — trim + collapse empty / whitespace-only comments to null so
// the column stores either a meaningful string or NULL, never " ".
function normaliseReviewComment(raw: string | null | undefined): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}
