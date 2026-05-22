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

    // Pre-validate that every candidatePersonId exists. Without this the
    // request would reach the slate.save() $transaction and fail there with
    // an opaque 500 from the StaffingRequestProposalCandidate.candidatePersonId
    // foreign-key. This can happen because person_skills.personId is not FK
    // constrained — the matcher can surface ids that have no Person row.
    const candidateIds = [...ids];
    const existingPersons = await this.prisma.person.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true },
    });
    if (existingPersons.length !== candidateIds.length) {
      const existingSet = new Set(existingPersons.map((p) => p.id));
      const missing = candidateIds.filter((cid) => !existingSet.has(cid));
      throw new BadRequestException(
        `Candidate person id(s) not found: ${missing.join(', ')}. Remove them from the slate and try again.`,
      );
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
      // F-67 / 20c-11 — back-fill the candidate's slateId via the typed
      // `bindToSlate` entity method instead of mutating `.props` through
      // an `as unknown as` cast.
      candidate.bindToSlate(slate.id);
    }

    // HD-0.2 Phase 2b: slate.save and the staffing-request status flip share
    // a single $transaction so a slate can never persist without its
    // matching IN_REVIEW status, and a status flip can never persist without
    // its slate. The slate repo's `save` joins the outer tx when supplied.
    await this.prisma.$transaction(async (tx) => {
      await this.slateRepository.save(slate, tx);
      if (request.status !== 'IN_REVIEW') {
        await tx.staffingRequest.update({
          where: { id: request.id },
          data: {
            status: 'IN_REVIEW',
            // F-129 / D-103-write-path round 39 — track slate submitter on
            // the parent SR's status flip.
            updatedByPersonId: input.actorId,
          },
        });
      }
    });

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
      data: {
        status: 'IN_REVIEW',
        // F-128 / D-103-write-path round 38 — track acknowledger.
        updatedByPersonId: input.actorId,
      },
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

    const allocationPercent =
      typeof request.allocationPercent === 'number'
        ? request.allocationPercent
        : request.allocationPercent.toNumber();

    // HD-0.2 Phase 2 — Cross-service `createAssignment.execute()` runs
    // its own internal $transaction (Phase 2a) and we cannot share the
    // tx context across services without changing its signature. Order
    // of writes (option C from the Phase 2 survey):
    //   1. Cross-service: create the assignment first. If this fails,
    //      neither the slate decision nor the request status flip have
    //      been written — clean rollback by absence.
    //   2. Our two writes (slate.save + request.update) share a single
    //      $transaction so they cannot disagree.
    // The narrow remaining failure window is "assignment created but
    // slate+request rollback at step 2" — recoverable via the
    // assignment row itself (which references the request).
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
    await this.prisma.$transaction(async (tx) => {
      await this.slateRepository.save(slate, tx);
      await tx.staffingRequest.update({
        where: { id: request.id },
        data: {
          headcountFulfilled: newHeadcount,
          status: nextStatus,
          // F-128 / D-103-write-path round 38 — track picker.
          updatedByPersonId: input.actorId,
        },
      });
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

    const nextRequestStatus: 'OPEN' | 'CANCELLED' = input.sendBack ? 'OPEN' : 'CANCELLED';

    // HD-0.2 Phase 2b: slate rejection and the request-status flip share a
    // single $transaction so the rollback path on either failure is clean.
    await this.prisma.$transaction(async (tx) => {
      await this.slateRepository.save(slate, tx);
      await tx.staffingRequest.update({
        where: { id: request.id },
        data: {
          status: nextRequestStatus,
          cancelledAt: nextRequestStatus === 'CANCELLED' ? timestamp : null,
          // F-128 / D-103-write-path round 38 — track rejecter.
          updatedByPersonId: input.actorId,
        },
      });
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
