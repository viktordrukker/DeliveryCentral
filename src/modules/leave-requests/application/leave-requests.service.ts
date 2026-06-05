import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRequestType } from '@prisma/client';

import {
  LEAVE_REQUEST_REPOSITORY,
  LeaveRequestRepositoryPort,
  LeaveRequestRow,
} from '../domain/repositories/leave-request-repository.port';
import { LeaveBalanceService } from './leave-balance.service';

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
  // LEAN-P4-missing-11 — CANCELLED added so self-serve cancel surfaces in DTO.
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  type: 'ANNUAL' | 'SICK' | 'OTHER';
}

/**
 * F-14.2 / 20c-02 — service consumes `LeaveRequestRepositoryPort` instead
 * of `PrismaService` directly. Repository pattern keeps Prisma row-shape
 * leakage stopped at the port boundary.
 *
 * Hot-patch 2026-05-25 / 20c-05 — `create` / `approve` / `reject`
 * previously mutated `LeaveRequest.status` without ever updating
 * `LeaveBalance`, leaving `used` and `pending` perpetually 0 in
 * production. The bug is closed by composing `LeaveBalanceService`
 * calls after the repository write on each path:
 *
 *   create  → ensureBalance + addPending(days)
 *   approve → deduct(days)            // pending → used
 *   reject  → restorePending(days)
 *
 * **Atomicity caveat:** writes are sequential, not wrapped in a Prisma
 * `$transaction`. If the balance write fails after the status write
 * succeeded, state is inconsistent (status mutated, balance not). This
 * is acceptable for the hot-patch — the prior state was "balance NEVER
 * updated"; the post-hot-patch state is "balance almost always
 * updated, reconciliable on retry". The proper atomic version
 * (tx-aware repository + balance service) is EW sprint S5-E5.
 */
@Injectable()
export class LeaveRequestsService {
  public constructor(
    @Inject(LEAVE_REQUEST_REPOSITORY)
    private readonly repository: LeaveRequestRepositoryPort,
    private readonly balanceService: LeaveBalanceService,
  ) {}

  public async create(dto: CreateLeaveRequestDto): Promise<LeaveRequestDto> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const actorId = dto.actorId ?? dto.personId;

    const record = await this.repository.create({
      endDate,
      notes: dto.notes ?? null,
      personId: dto.personId,
      startDate,
      type: dto.type,
      // F-112 / D-103-write-path round 22 — default to the subject when
      // no explicit actor (self-serve submission).
      actorId,
    });

    // 20c-05 hot-patch — reserve balance against pending column.
    const days = calculateLeaveDaysInclusive(startDate, endDate);
    const year = startDate.getUTCFullYear();
    await this.balanceService.ensureBalance(
      dto.personId,
      year,
      dto.type as LeaveRequestType,
      0,
      actorId,
    );
    await this.balanceService.addPending(
      dto.personId,
      year,
      dto.type as LeaveRequestType,
      days,
      actorId,
    );

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

    // 20c-05 hot-patch — on approval: pending → used.
    const days = calculateLeaveDaysInclusive(record.startDate, record.endDate);
    const year = record.startDate.getUTCFullYear();
    await this.balanceService.ensureBalance(
      record.personId,
      year,
      record.type as LeaveRequestType,
      0,
      reviewerId,
    );
    await this.balanceService.deduct(
      record.personId,
      year,
      record.type as LeaveRequestType,
      days,
      reviewerId,
    );

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

    // 20c-05 hot-patch — on rejection: pending released, no `used` change.
    const days = calculateLeaveDaysInclusive(record.startDate, record.endDate);
    const year = record.startDate.getUTCFullYear();
    await this.balanceService.ensureBalance(
      record.personId,
      year,
      record.type as LeaveRequestType,
      0,
      reviewerId,
    );
    await this.balanceService.restorePending(
      record.personId,
      year,
      record.type as LeaveRequestType,
      days,
      reviewerId,
    );

    return this.toDto(updated);
  }

  /**
   * LEAN-P4-missing-11 — self-serve cancel of a PENDING leave request.
   *
   * Authorization: only the requester (record.personId === actorId) can
   * cancel their own pending request. HR / managers should reject via the
   * existing /reject endpoint. Returns the updated DTO with status =
   * CANCELLED and releases the pending balance.
   */
  public async cancel(id: string, actorId: string): Promise<LeaveRequestDto> {
    const record = await this.repository.findById(id);
    if (!record) throw new NotFoundException('Leave request not found');
    if (record.personId !== actorId) {
      throw new ForbiddenException('You can only cancel your own leave requests.');
    }
    if (record.status !== 'PENDING') {
      throw new ForbiddenException('Only pending requests can be cancelled.');
    }

    const updated = await this.repository.cancel(id, { actorId });

    // Release the pending balance reservation the create() call put on hold.
    const days = calculateLeaveDaysInclusive(record.startDate, record.endDate);
    const year = record.startDate.getUTCFullYear();
    await this.balanceService.ensureBalance(
      record.personId,
      year,
      record.type as LeaveRequestType,
      0,
      actorId,
    );
    await this.balanceService.restorePending(
      record.personId,
      year,
      record.type as LeaveRequestType,
      days,
      actorId,
    );

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
      status: record.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
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

// 20c-05 hot-patch — inclusive day count (e.g. start = end → 1 day).
// Calendar-day granularity; matches the leave-balance Decimal scale.
// Proper policy (working-day vs calendar-day vs half-day) is EW S5-E2.
function calculateLeaveDaysInclusive(startDate: Date, endDate: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  return Math.max(1, Math.floor((end - start) / MS_PER_DAY) + 1);
}
