import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRequestType } from '@prisma/client';

import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

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
  // LEAN-P4-missing-12 — manager to notify on submit. Optional;
  // controller / caller resolves via ReportingLine when available.
  managerPersonId?: string;
}

export interface LeaveRequestDto {
  createdAt: string;
  endDate: string;
  id: string;
  notes: string | null;
  personId: string;
  // SC-7 — resolved requester name (list paths). Undefined on single-record paths.
  personName?: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  // Track B.1 — reviewer's justification surfaced in audit / decision drawer.
  reviewComment: string | null;
  startDate: string;
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
    // LEAN-P4-missing-12 — optional translator so existing tests (which
    // instantiate the service with just repo + balance) keep compiling.
    // Production DI always provides the translator; the dispatch calls
    // below are no-ops when undefined.
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
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

    // LEAN-P4-missing-12 — fan-out submitted event to translator (manager
    // notification + outbox). `managerPersonId` is resolved by the
    // caller when available; absent => no in-app notification (email-only).
    void this.notificationEventTranslator?.leaveSubmitted({
      leaveRequestId: record.id,
      personId: record.personId,
      startDate: record.startDate.toISOString().slice(0, 10),
      endDate: record.endDate.toISOString().slice(0, 10),
      type: record.type,
      managerPersonId: dto.managerPersonId,
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

    // LEAN-P4-missing-12 — notify employee of decision.
    void this.notificationEventTranslator?.leaveApproved({
      leaveRequestId: updated.id,
      personId: updated.personId,
      startDate: updated.startDate.toISOString().slice(0, 10),
      endDate: updated.endDate.toISOString().slice(0, 10),
      type: updated.type,
      reviewerPersonId: reviewerId,
      reviewComment: updated.reviewComment,
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

    // LEAN-P4-missing-12 — notify employee of decision.
    void this.notificationEventTranslator?.leaveRejected({
      leaveRequestId: updated.id,
      personId: updated.personId,
      startDate: updated.startDate.toISOString().slice(0, 10),
      endDate: updated.endDate.toISOString().slice(0, 10),
      type: updated.type,
      reviewerPersonId: reviewerId,
      reviewComment: updated.reviewComment,
    });

    return this.toDto(updated);
  }

  /**
   * LEAN-P4-missing-12 — employee-initiated cancellation of a pending
   * leave request. Releases any pending balance and notifies the manager
   * (if known). HR-initiated decisions go through approve / reject.
   */
  public async cancelByEmployee(
    id: string,
    employeeId: string,
    managerPersonId?: string,
  ): Promise<LeaveRequestDto> {
    const record = await this.repository.findById(id);
    if (!record) throw new NotFoundException('Leave request not found');
    if (record.personId !== employeeId) {
      throw new ForbiddenException('Only the requesting employee may cancel a leave request');
    }
    if (record.status !== 'PENDING') {
      throw new ForbiddenException('Only pending requests can be cancelled');
    }

    const updated = await this.repository.updateStatus(id, {
      reviewedAt: new Date(),
      reviewedBy: employeeId,
      status: 'CANCELLED',
      actorId: employeeId,
    });

    // Release reserved balance (same shape as reject path).
    const days = calculateLeaveDaysInclusive(record.startDate, record.endDate);
    const year = record.startDate.getUTCFullYear();
    await this.balanceService.ensureBalance(
      record.personId,
      year,
      record.type as LeaveRequestType,
      0,
      employeeId,
    );
    await this.balanceService.restorePending(
      record.personId,
      year,
      record.type as LeaveRequestType,
      days,
      employeeId,
    );

    void this.notificationEventTranslator?.leaveCancelledByEmployee({
      leaveRequestId: updated.id,
      personId: updated.personId,
      startDate: updated.startDate.toISOString().slice(0, 10),
      endDate: updated.endDate.toISOString().slice(0, 10),
      type: updated.type,
      managerPersonId,
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
      personName: record.personName,
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
