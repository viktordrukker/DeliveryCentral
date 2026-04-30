import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { CreateProjectAssignmentService } from '@src/modules/assignments/application/create-project-assignment.service';
import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

import { StaffingRequestProposalCandidate } from '../domain/entities/staffing-request-proposal-candidate.entity';
import { StaffingRequestProposalSlate } from '../domain/entities/staffing-request-proposal-slate.entity';
import { StaffingRequestProposalSlateRepositoryPort } from '../domain/repositories/staffing-request-proposal-slate-repository.port';

export const STAFFING_REQUEST_PROPOSAL_SLATE_REPOSITORY =
  Symbol('StaffingRequestProposalSlateRepository');

interface SubmitSlateCandidateInput {
  candidatePersonId: string;
  rank: number;
  matchScore: number;
  availabilityPercent?: number;
  mismatchedSkills?: string[];
  rationale?: string;
}

interface SubmitSlateInput {
  actorId: string;
  actorRoles: readonly PlatformRole[];
  staffingRequestId: string;
  candidates: SubmitSlateCandidateInput[];
  expiresAt?: Date;
}

interface SimpleActorInput {
  actorId: string;
  actorRoles: readonly PlatformRole[];
  staffingRequestId: string;
}

interface AcknowledgeSlateInput extends SimpleActorInput {
  slateId: string;
}

interface PickCandidateInput extends SimpleActorInput {
  slateId: string;
  candidateId: string;
}

interface RejectSlateInput extends SimpleActorInput {
  slateId: string;
  reasonCode: string;
  reason?: string;
  sendBack: boolean;
}

interface StaffingRequestRow {
  id: string;
  projectId: string;
  status: string;
  role: string;
  startDate: Date;
  endDate: Date;
  allocationPercent: { toNumber: () => number } | number;
  headcountRequired: number;
  headcountFulfilled: number;
  requestedByPersonId: string;
}

const KEY_SLATE_MIN = 'assignment.slate.minCandidates';
const KEY_SLATE_MAX = 'assignment.slate.maxCandidates';
const DEFAULT_SLATE_MIN = 1;
const DEFAULT_SLATE_MAX = 5;

@Injectable()
export class StaffingProposalSlateService {
  public constructor(
    @Inject(STAFFING_REQUEST_PROPOSAL_SLATE_REPOSITORY)
    private readonly slateRepository: StaffingRequestProposalSlateRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly createAssignment: CreateProjectAssignmentService,
    @Optional() private readonly auditLogger?: AuditLoggerService,
    @Optional() private readonly notifications?: NotificationEventTranslatorService,
  ) {}

  public async findByStaffingRequestId(
    staffingRequestIdOrPublicId: string,
  ): Promise<StaffingRequestProposalSlate | null> {
    const isPublicId = /^stf_[A-Za-z0-9]{10,}$/.test(staffingRequestIdOrPublicId);
    let canonicalId = staffingRequestIdOrPublicId;
    if (isPublicId) {
      const row = await this.prisma.staffingRequest.findUnique({
        where: { publicId: staffingRequestIdOrPublicId },
        select: { id: true },
      });
      if (!row) return null;
      canonicalId = row.id;
    }
    return this.slateRepository.findByStaffingRequestId(canonicalId);
  }

  public async submit(input: SubmitSlateInput): Promise<StaffingRequestProposalSlate> {
    const request = await this.requireRequest(input.staffingRequestId);
    const { min, max } = await this.loadSlateBounds();

    if (input.candidates.length < min) {
      throw new BadRequestException(
        `Slate must include at least ${min} candidate(s); got ${input.candidates.length}.`,
      );
    }
    if (input.candidates.length > max) {
      throw new BadRequestException(
        `Slate may include at most ${max} candidate(s); got ${input.candidates.length}.`,
      );
    }

    const ids = new Set<string>();
    const ranks = new Set<number>();
    for (const c of input.candidates) {
      if (ids.has(c.candidatePersonId)) {
        throw new BadRequestException(
          `Candidate person ${c.candidatePersonId} appears more than once in the slate.`,
        );
      }
      if (ranks.has(c.rank)) {
        throw new BadRequestException(`Rank ${c.rank} appears more than once in the slate.`);
      }
      ids.add(c.candidatePersonId);
      ranks.add(c.rank);
    }

    const existing = await this.slateRepository.findByStaffingRequestId(request.id);
    if (existing && existing.status === 'OPEN') {
      throw new ConflictException(
        `Staffing request ${input.staffingRequestId} already has an open proposal slate. Withdraw it first.`,
      );
    }

    if (request.status !== 'OPEN' && request.status !== 'IN_REVIEW') {
      throw new ConflictException(
        `Staffing request ${input.staffingRequestId} cannot accept a slate in status ${request.status}.`,
      );
    }

    const slate = StaffingRequestProposalSlate.create({
      staffingRequestId: request.id,
      proposedByPersonId: input.actorId,
      proposedAt: new Date(),
      expiresAt: input.expiresAt,
      candidates: input.candidates.map((c) =>
        StaffingRequestProposalCandidate.create({
          slateId: '__pending__',
          candidatePersonId: c.candidatePersonId,
          rank: c.rank,
          matchScore: c.matchScore,
          availabilityPercent: c.availabilityPercent,
          mismatchedSkills: c.mismatchedSkills ?? [],
          rationale: c.rationale,
        }),
      ),
    });

    for (const candidate of slate.candidates) {
      // The slate id is now known; back-fill the candidate's slateId reference.
      (candidate as unknown as { props: { slateId: string } }).props.slateId = slate.id;
    }

    await this.slateRepository.save(slate);

    // Submitting a slate moves the request to IN_REVIEW (PM has work to do).
    if (request.status !== 'IN_REVIEW') {
      await this.prisma.staffingRequest.update({
        where: { id: request.id },
        data: { status: 'IN_REVIEW' },
      });
    }

    this.auditLogger?.record({
      actionType: 'staffing_request.proposal_slate_submitted',
      actorId: input.actorId,
      category: 'assignment',
      changeSummary: `Proposal slate submitted for staffing request ${input.staffingRequestId}.`,
      details: {
        staffingRequestId: input.staffingRequestId,
        slateId: slate.id,
        candidateCount: slate.candidates.length,
      },
      metadata: {
        candidateIds: slate.candidates.map((c) => c.candidatePersonId),
      },
      targetEntityId: input.staffingRequestId,
      targetEntityType: 'STAFFING_REQUEST',
    });

    await this.notifications
      ?.proposalSubmitted({
        assignmentId: input.staffingRequestId,
        candidateCount: slate.candidates.length,
        recipientPersonIds: [request.requestedByPersonId],
      })
      .catch(() => undefined);

    return slate;
  }

  public async acknowledge(input: AcknowledgeSlateInput): Promise<StaffingRequestProposalSlate> {
    const request = await this.requireRequest(input.staffingRequestId);
    const slate = await this.requireSlate(input.slateId);

    if (slate.staffingRequestId !== request.id) {
      throw new BadRequestException(
        `Slate ${input.slateId} does not belong to request ${input.staffingRequestId}.`,
      );
    }
    if (request.status === 'IN_REVIEW') {
      // Idempotent: PM may revisit the page mid-review.
      return slate;
    }
    if (request.status !== 'OPEN') {
      throw new ConflictException(
        `Staffing request ${input.staffingRequestId} cannot move to IN_REVIEW from ${request.status}.`,
      );
    }

    await this.prisma.staffingRequest.update({
      where: { id: request.id },
      data: { status: 'IN_REVIEW' },
    });

    this.auditLogger?.record({
      actionType: 'staffing_request.proposal_acknowledged',
      actorId: input.actorId,
      category: 'assignment',
      changeSummary: `Reviewer acknowledged proposal for staffing request ${input.staffingRequestId}.`,
      details: { staffingRequestId: input.staffingRequestId, slateId: slate.id },
      metadata: { slateId: slate.id },
      targetEntityId: input.staffingRequestId,
      targetEntityType: 'STAFFING_REQUEST',
    });

    await this.notifications
      ?.proposalAcknowledged({
        assignmentId: input.staffingRequestId,
        recipientPersonIds: [slate.proposedByPersonId],
      })
      .catch(() => undefined);

    return slate;
  }

  public async pickCandidate(input: PickCandidateInput): Promise<{
    assignmentId: string;
    slate: StaffingRequestProposalSlate;
  }> {
    const request = await this.requireRequest(input.staffingRequestId);
    const slate = await this.requireSlate(input.slateId);

    if (slate.staffingRequestId !== request.id) {
      throw new BadRequestException(
        `Slate ${input.slateId} does not belong to request ${input.staffingRequestId}.`,
      );
    }
    if (request.status !== 'IN_REVIEW' && request.status !== 'OPEN') {
      throw new ConflictException(
        `Staffing request ${input.staffingRequestId} must be OPEN or IN_REVIEW to pick a candidate (current: ${request.status}).`,
      );
    }

    const timestamp = new Date();
    const picked = slate.pickCandidate(input.candidateId, timestamp);

    // Persist slate decision before kicking off the downstream assignment write —
    // if the assignment-create fails the slate still records the pick attempt.
    await this.slateRepository.save(slate);

    const allocationPercent =
      typeof request.allocationPercent === 'number'
        ? request.allocationPercent
        : request.allocationPercent.toNumber();

    const assignment = await this.createAssignment.execute({
      actorId: input.actorId,
      allocationPercent,
      endDate: request.endDate.toISOString(),
      initialStatus: 'BOOKED',
      personId: picked.candidatePersonId,
      projectId: request.projectId,
      staffingRequestId: request.id,
      staffingRole: request.role,
      startDate: request.startDate.toISOString(),
    });

    // Increment fulfilment headcount; if it now meets the requirement, mark request FULFILLED.
    const newHeadcount = Math.min(request.headcountFulfilled + 1, request.headcountRequired);
    const nextStatus = newHeadcount >= request.headcountRequired ? 'FULFILLED' : request.status;
    await this.prisma.staffingRequest.update({
      where: { id: request.id },
      data: { headcountFulfilled: newHeadcount, status: nextStatus },
    });

    this.auditLogger?.record({
      actionType: 'staffing_request.proposal_candidate_picked',
      actorId: input.actorId,
      category: 'assignment',
      changeSummary: `Picked candidate ${picked.candidatePersonId} for request ${input.staffingRequestId}; assignment ${assignment.id} created.`,
      details: {
        staffingRequestId: input.staffingRequestId,
        slateId: slate.id,
        candidateId: picked.id,
        candidatePersonId: picked.candidatePersonId,
        assignmentId: assignment.id,
      },
      metadata: {
        candidateId: picked.id,
        candidatePersonId: picked.candidatePersonId,
        assignmentId: assignment.id,
      },
      targetEntityId: input.staffingRequestId,
      targetEntityType: 'STAFFING_REQUEST',
    });

    return { assignmentId: assignment.id, slate };
  }

  public async rejectAll(input: RejectSlateInput): Promise<{
    slate: StaffingRequestProposalSlate;
    nextRequestStatus: 'OPEN' | 'CANCELLED';
  }> {
    if (!input.reasonCode?.trim()) {
      throw new BadRequestException('Rejection reason code is required.');
    }
    await this.assertReasonCodeIsValid(input.reasonCode);

    const request = await this.requireRequest(input.staffingRequestId);
    const slate = await this.requireSlate(input.slateId);

    if (slate.staffingRequestId !== request.id) {
      throw new BadRequestException(
        `Slate ${input.slateId} does not belong to request ${input.staffingRequestId}.`,
      );
    }
    if (request.status !== 'IN_REVIEW' && request.status !== 'OPEN') {
      throw new ConflictException(
        `Staffing request ${input.staffingRequestId} cannot be rejected from status ${request.status}.`,
      );
    }

    const timestamp = new Date();
    if (slate.status === 'OPEN') {
      slate.rejectAll(timestamp);
    }
    await this.slateRepository.save(slate);

    const nextRequestStatus: 'OPEN' | 'CANCELLED' = input.sendBack ? 'OPEN' : 'CANCELLED';
    await this.prisma.staffingRequest.update({
      where: { id: request.id },
      data: {
        status: nextRequestStatus,
        cancelledAt: nextRequestStatus === 'CANCELLED' ? timestamp : null,
      },
    });

    this.auditLogger?.record({
      actionType: 'staffing_request.proposal_slate_rejected',
      actorId: input.actorId,
      category: 'assignment',
      changeSummary: `Rejected slate ${slate.id} for request ${input.staffingRequestId} (${input.reasonCode}); next status ${nextRequestStatus}.`,
      details: {
        staffingRequestId: input.staffingRequestId,
        slateId: slate.id,
        reasonCode: input.reasonCode,
        reason: input.reason,
        sendBack: input.sendBack,
        nextRequestStatus,
      },
      metadata: {
        slateId: slate.id,
        reasonCode: input.reasonCode,
      },
      targetEntityId: input.staffingRequestId,
      targetEntityType: 'STAFFING_REQUEST',
    });

    return { slate, nextRequestStatus };
  }

  private async requireRequest(staffingRequestIdOrPublicId: string): Promise<StaffingRequestRow> {
    const isPublicId = /^stf_[A-Za-z0-9]{10,}$/.test(staffingRequestIdOrPublicId);
    const row = (await this.prisma.staffingRequest.findUnique({
      where: isPublicId
        ? { publicId: staffingRequestIdOrPublicId }
        : { id: staffingRequestIdOrPublicId },
    })) as StaffingRequestRow | null;
    if (!row) {
      throw new NotFoundException(`Staffing request ${staffingRequestIdOrPublicId} not found.`);
    }
    return row;
  }

  private async requireSlate(slateId: string): Promise<StaffingRequestProposalSlate> {
    const slate = await this.slateRepository.findById(slateId);
    if (!slate) {
      throw new NotFoundException(`Proposal slate ${slateId} not found.`);
    }
    return slate;
  }

  private async loadSlateBounds(): Promise<{ min: number; max: number }> {
    const rows = await this.prisma.platformSetting.findMany({
      where: { key: { in: [KEY_SLATE_MIN, KEY_SLATE_MAX] } },
    });
    const map = new Map(rows.map((r: { key: string; value: unknown }) => [r.key, r.value]));
    const min = this.coerceNumber(map.get(KEY_SLATE_MIN), DEFAULT_SLATE_MIN);
    const max = this.coerceNumber(map.get(KEY_SLATE_MAX), DEFAULT_SLATE_MAX);
    if (min > max) {
      throw new Error(`Misconfigured slate bounds: min=${min} cannot exceed max=${max}.`);
    }
    return { min, max };
  }

  private async assertReasonCodeIsValid(code: string): Promise<void> {
    const dictionary = await this.prisma.metadataDictionary.findFirst({
      where: { dictionaryKey: 'assignment-rejection-reasons' },
      include: { entries: { where: { isEnabled: true } } },
    });
    if (!dictionary) return; // permissive when admins haven't seeded yet
    const allowed = dictionary.entries.map((e: { entryKey: string }) => e.entryKey);
    if (!allowed.includes(code)) {
      throw new BadRequestException(
        `Rejection reason code "${code}" is not in the allowed taxonomy. Allowed: ${allowed.join(', ')}.`,
      );
    }
  }

  private coerceNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const n = Number(value);
      if (!Number.isNaN(n)) return n;
    }
    return fallback;
  }
}
