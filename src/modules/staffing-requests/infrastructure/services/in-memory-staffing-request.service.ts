import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';
import { mapStaffingRequestStatusToFillStatus } from '@src/shared/lean-migration/enum-mappings';

const PROJECT_STATUSES_BLOCKED_FOR_NEW_REQUESTS = new Set(['CLOSED', 'ARCHIVED', 'CANCELLED', 'COMPLETED']);
const STAFFING_ROLES_DICTIONARY_KEY = 'staffing-roles';

export type StaffingRequestStatus = 'CANCELLED' | 'DRAFT' | 'FULFILLED' | 'IN_REVIEW' | 'OPEN';
export type StaffingRequestPriority = 'HIGH' | 'LOW' | 'MEDIUM' | 'URGENT';

export interface StaffingRequestFulfilment {
  assignedPersonId: string;
  fulfilledAt: string;
  id: string;
  proposedByPersonId: string;
}

export interface StaffingRequest {
  allocationPercent: number;
  cancelledAt?: string;
  candidatePersonId?: string;
  createdAt: string;
  endDate: string;
  fulfilments: StaffingRequestFulfilment[];
  headcountFulfilled: number;
  headcountRequired: number;
  /**
   * External identifier (DMD-026). During the DM-2.5 transition window this
   * field holds the publicId (`stf_…`) if the row has one, or falls back to
   * the internal uuid for rows created before the DM-2 expand migration
   * populated the publicId column. New clients should prefer `publicId` below.
   */
  id: string;
  publicId: string;
  priority: StaffingRequestPriority;
  projectId: string;
  projectName?: string;
  requestedByPersonId: string;
  role: string;
  skills: string[];
  startDate: string;
  status: StaffingRequestStatus;
  summary?: string;
  updatedAt: string;
}

export interface CreateStaffingRequestCommand {
  allocationPercent: number;
  candidatePersonId?: string;
  endDate: string;
  headcountRequired?: number;
  priority: StaffingRequestPriority;
  projectId: string;
  requestedByPersonId: string;
  role: string;
  skills?: string[];
  startDate: string;
  summary?: string;
}

export interface ListStaffingRequestsQuery {
  priority?: StaffingRequestPriority;
  projectId?: string;
  requestedByPersonId?: string;
  status?: StaffingRequestStatus;
}

// F-53 / 20c-11 — the local `PrismaRecord` interface used to hand-roll the
// Prisma `StaffingRequest` shape (including `fulfilments[]` from the include)
// and was paired with 10 `as unknown as PrismaRecord` coercions on every
// findUnique/findMany/update call. Replaced with the Prisma-derived payload
// so callers can hand the row to `toResponse` without any coercion.
type PrismaRecord = Prisma.StaffingRequestGetPayload<{ include: { fulfilments: true } }>;

@Injectable()
export class InMemoryStaffingRequestService {
  // SoT PR 15 — logger for the legacy `StaffingRequest` mirror write.
  // Failures on the legacy mirror are caught + logged; the canonical
  // ProjectPosition write is the source of truth post-PR 15.
  private readonly logger = new Logger(InMemoryStaffingRequestService.name);

  public constructor(private readonly prisma: PrismaService) {}

  public async create(command: CreateStaffingRequestCommand): Promise<StaffingRequest> {
    await this.assertProjectIsOpenForRequests(command.projectId);
    await this.assertRoleIsInDictionary(command.role);
    if (command.skills && command.skills.length > 0) {
      await this.assertSkillsAreInCatalog(command.skills);
    }

    // SoT PR 15 — canonical write order: ProjectPosition first, legacy
    // `StaffingRequest` row second (as mirror). The legacy SR id is
    // generated up-front so the canonical position can pin
    // `legacyStaffingRequestId` against a stable id before the legacy
    // row exists. If the canonical position write fails the whole
    // operation aborts; if the legacy mirror write fails the
    // canonical row remains and parity reports an "orphan" — operators
    // can reconcile via the daily soak snapshot. PR 16 drops the
    // legacy mirror entirely.
    const legacyId = randomUUID();
    await this.writeCanonicalProjectPositionForSr(
      {
        legacyId,
        projectId: command.projectId,
        role: command.role,
        skills: command.skills ?? [],
        summary: command.summary ?? undefined,
        allocationPercent: command.allocationPercent,
        startDate: new Date(command.startDate),
        endDate: new Date(command.endDate),
        priority: command.priority,
        requestedByPersonId: command.requestedByPersonId,
        candidatePersonId: command.candidatePersonId ?? null,
        status: 'DRAFT',
      },
      command.requestedByPersonId,
    );

    const record = await this.prisma.staffingRequest.create({
      data: {
        id: legacyId,
        allocationPercent: command.allocationPercent,
        candidatePersonId: command.candidatePersonId ?? null,
        endDate: new Date(command.endDate),
        headcountRequired: command.headcountRequired ?? 1,
        priority: command.priority,
        projectId: command.projectId,
        requestedByPersonId: command.requestedByPersonId,
        // F-92 / D-103-write-path — actor-audit column added by F-68.
        // In this flow the requester is the only available actor; if
        // the controller starts distinguishing "admin acting on behalf"
        // from "self-requested", swap this to the principal-derived id.
        createdByPersonId: command.requestedByPersonId,
        role: command.role,
        skills: command.skills ?? [],
        startDate: new Date(command.startDate),
        status: 'DRAFT',
        summary: command.summary,
      },
      include: { fulfilments: true },
    });
    const projectName = await this.resolveProjectName(command.projectId);
    return this.toResponse(record, projectName);
  }

  private async assertProjectIsOpenForRequests(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true, archivedAt: true, name: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found.`);
    }
    if (project.archivedAt || PROJECT_STATUSES_BLOCKED_FOR_NEW_REQUESTS.has(project.status)) {
      throw new BadRequestException(
        `Project "${project.name}" is ${project.status.toLowerCase()}; staffing requests cannot be filed against it. Open a Case instead.`,
      );
    }
  }

  private async assertRoleIsInDictionary(role: string): Promise<void> {
    const dict = await this.prisma.metadataDictionary.findFirst({
      where: { dictionaryKey: STAFFING_ROLES_DICTIONARY_KEY, archivedAt: null },
      include: { entries: { where: { isEnabled: true }, select: { entryValue: true } } },
    });
    if (!dict) {
      // Be permissive when the taxonomy hasn't been seeded yet.
      return;
    }
    const allowed = dict.entries.map((e) => e.entryValue);
    if (!allowed.includes(role)) {
      throw new BadRequestException(
        `Role "${role}" is not in the staffing-roles taxonomy. Allowed roles: ${allowed.join(', ')}.`,
      );
    }
  }

  private async assertSkillsAreInCatalog(skills: string[]): Promise<void> {
    const matches = await this.prisma.skill.findMany({
      where: { name: { in: skills } },
      select: { name: true },
    });
    const known = new Set(matches.map((s) => s.name));
    const unknown = skills.filter((s) => !known.has(s));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Skills are not in the catalog: ${unknown.join(', ')}. Pick from the existing skill library.`,
      );
    }
  }

  public async list(query: ListStaffingRequestsQuery = {}): Promise<StaffingRequest[]> {
    const records = await this.prisma.staffingRequest.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
        ...(query.requestedByPersonId ? { requestedByPersonId: query.requestedByPersonId } : {}),
      },
      include: { fulfilments: true },
      orderBy: { createdAt: 'desc' },
    });

    const projectIds = [...new Set(records.map((r) => r.projectId))];
    const projectNameMap = await this.resolveProjectNames(projectIds);

    return records.map((r) => this.toResponse(r, projectNameMap[r.projectId]));
  }

  // DM-2.5-8-staffing Sub-B: resolve the input id (uuid or `stf_…`) to
  // the internal uuid before every Prisma write. Returns null if no
  // match so callers can surface NotFound.
  private async resolveInternalId(idOrPublicId: string): Promise<string | null> {
    const row = await this.findRecordByIdOrPublicId(idOrPublicId);
    return row ? row.id : null;
  }

  public async getById(idOrPublicId: string): Promise<StaffingRequest | undefined> {
    const id = await this.resolveInternalId(idOrPublicId);
    if (!id) return undefined;
    const record = await this.prisma.staffingRequest.findUnique({
      where: { id },
      include: { fulfilments: true },
    });
    if (!record) return undefined;
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record, projectName);
  }

  // F-97 / D-103-write-path — submit/review/release/cancel/update now accept
  // an optional `actorId` so the SR.updatedByPersonId tracks each transition.

  public async submit(idOrPublicId: string, actorId?: string): Promise<StaffingRequest> {
    const id = await this.resolveInternalId(idOrPublicId);
    if (!id) throw new NotFoundException('Staffing request not found.');
    const existing = await this.prisma.staffingRequest.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw new NotFoundException('Staffing request not found.');
    if (existing.status !== 'DRAFT') throw new ConflictException(`Cannot submit from status ${existing.status}.`);
    const record = await this.prisma.staffingRequest.update({
      where: { id },
      data: { status: 'OPEN', updatedByPersonId: actorId ?? null },
      include: { fulfilments: true },
    });
    // LEAN-P1-9 — propagate the DRAFT → OPEN transition onto the mirror position.
    await this.dualWriteProjectPosition(record, actorId);
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record, projectName);
  }

  public async review(idOrPublicId: string, actorId?: string): Promise<StaffingRequest> {
    const id = await this.resolveInternalId(idOrPublicId);
    if (!id) throw new NotFoundException('Staffing request not found.');
    const existing = await this.prisma.staffingRequest.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw new NotFoundException('Staffing request not found.');
    if (existing.status !== 'OPEN') throw new ConflictException(`Cannot review from status ${existing.status}.`);
    const record = await this.prisma.staffingRequest.update({
      where: { id },
      data: { status: 'IN_REVIEW', updatedByPersonId: actorId ?? null },
      include: { fulfilments: true },
    });
    // LEAN-P1-9 — IN_REVIEW maps to PROPOSED on the lean position (mapper
    // collapses both legacy review and proposal states onto PROPOSED).
    await this.dualWriteProjectPosition(record, actorId);
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record, projectName);
  }

  public async release(idOrPublicId: string, actorId?: string): Promise<StaffingRequest> {
    const id = await this.resolveInternalId(idOrPublicId);
    if (!id) throw new NotFoundException('Staffing request not found.');
    const existing = await this.prisma.staffingRequest.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw new NotFoundException('Staffing request not found.');
    if (existing.status !== 'IN_REVIEW') throw new ConflictException(`Cannot release from status ${existing.status}.`);
    const record = await this.prisma.staffingRequest.update({
      where: { id },
      data: { status: 'OPEN', updatedByPersonId: actorId ?? null },
      include: { fulfilments: true },
    });
    // LEAN-P1-9 — release here means "send the proposal back to OPEN"
    // (not the lean terminal RELEASED state). The mapper renders OPEN as
    // OPEN on the lean position.
    await this.dualWriteProjectPosition(record, actorId);
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record, projectName);
  }

  public async fulfil(idOrPublicId: string, proposedByPersonId: string, assignedPersonId: string): Promise<StaffingRequest> {
    const id = await this.resolveInternalId(idOrPublicId);
    if (!id) throw new NotFoundException('Staffing request not found.');
    const existing = await this.prisma.staffingRequest.findUnique({
      where: { id },
      select: { status: true, headcountRequired: true, headcountFulfilled: true },
    });
    if (!existing) throw new NotFoundException('Staffing request not found.');
    if (existing.status === 'CANCELLED' || existing.status === 'FULFILLED') {
      throw new ConflictException(`Cannot fulfil from status ${existing.status}.`);
    }

    const newFulfilled = existing.headcountFulfilled + 1;
    const newStatus = newFulfilled >= existing.headcountRequired ? 'FULFILLED' : 'IN_REVIEW';

    await this.prisma.staffingRequestFulfilment.create({
      data: {
        id: randomUUID(),
        assignedPersonId,
        proposedByPersonId,
        requestId: id,
        // F-96 / D-103-write-path — actor on the fulfilment row is the
        // proposer (the RM/PM who picked the candidate). Same value as
        // proposedByPersonId today; canonical actor-audit semantic
        // diverges if/when an admin acts on behalf.
        createdByPersonId: proposedByPersonId,
        updatedByPersonId: proposedByPersonId,
      },
    });

    const record = await this.prisma.staffingRequest.update({
      where: { id },
      data: {
        headcountFulfilled: newFulfilled,
        status: newStatus,
        // F-96 / D-103-write-path — track who last touched the parent SR.
        updatedByPersonId: proposedByPersonId,
      },
      include: { fulfilments: true },
    });
    // LEAN-P1-9 — sync the mirror position. The enum mapper renders FULFILLED
    // as ASSIGNED and IN_REVIEW as PROPOSED on the lean position. activePersonId
    // is set to the just-assigned person so lean readers can resolve who is on
    // the position without joining back through StaffingRequestFulfilment.
    await this.dualWriteProjectPosition(record, proposedByPersonId, {
      activePersonId: assignedPersonId,
    });
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record, projectName);
  }

  public async duplicate(idOrPublicId: string, actorId?: string): Promise<StaffingRequest> {
    const id = await this.resolveInternalId(idOrPublicId);
    if (!id) throw new NotFoundException('Staffing request not found.');
    const source = await this.prisma.staffingRequest.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Staffing request not found.');

    const record = await this.prisma.staffingRequest.create({
      data: {
        allocationPercent: source.allocationPercent,
        candidatePersonId: source.candidatePersonId ?? null,
        endDate: source.endDate,
        headcountRequired: 1,
        priority: source.priority,
        projectId: source.projectId,
        requestedByPersonId: source.requestedByPersonId,
        role: source.role,
        skills: source.skills,
        startDate: source.startDate,
        status: 'DRAFT',
        summary: source.summary,
        // F-122 / D-103-write-path round 32 — duplicator is the actor
        // for the new SR (falls back to original requester so we never
        // write a NULL-pair).
        createdByPersonId: actorId ?? source.requestedByPersonId,
        updatedByPersonId: actorId ?? source.requestedByPersonId,
      },
      include: { fulfilments: true },
    });
    // LEAN-P1-9 — spawn a fresh mirror position for the duplicated SR
    // (legacyStaffingRequestId points to the new row, not the source).
    await this.dualWriteProjectPosition(record, actorId ?? source.requestedByPersonId);
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record, projectName);
  }

  public async cancel(idOrPublicId: string, actorId?: string): Promise<StaffingRequest> {
    const id = await this.resolveInternalId(idOrPublicId);
    if (!id) throw new NotFoundException('Staffing request not found.');
    const existing = await this.prisma.staffingRequest.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw new NotFoundException('Staffing request not found.');
    if (existing.status === 'FULFILLED' || existing.status === 'CANCELLED') {
      throw new ConflictException(`Cannot cancel from status ${existing.status}.`);
    }

    // BUG-SR-1 / Layer B — if there's an OPEN proposal slate attached, mark
    // it DECIDED and decline its PENDING candidates inside the same tx as
    // the SR cancel. Without this the slate stayed OPEN and the UI kept
    // rendering its "Pick selected candidate" action on a cancelled request.
    const openSlate = await this.prisma.staffingRequestProposalSlate.findFirst({
      where: { staffingRequestId: id, status: 'OPEN' },
      select: { id: true },
    });

    const timestamp = new Date();
    const record = await this.prisma.$transaction(async (tx) => {
      if (openSlate) {
        await tx.staffingRequestProposalCandidate.updateMany({
          where: { slateId: openSlate.id, decision: 'PENDING' },
          data: {
            decision: 'DECLINED',
            decidedAt: timestamp,
            // F-122 / D-103-write-path round 32 — record canceller on
            // implicit candidate decline.
            updatedByPersonId: actorId ?? null,
          },
        });
        await tx.staffingRequestProposalSlate.update({
          where: { id: openSlate.id },
          data: {
            status: 'DECIDED',
            decidedAt: timestamp,
            // F-122 / D-103-write-path — record canceller on the
            // slate's terminal status flip too.
            updatedByPersonId: actorId ?? null,
          },
        });
      }
      return tx.staffingRequest.update({
        where: { id },
        // F-97 / D-103-write-path — record cancellation actor on SR.
        data: { status: 'CANCELLED', cancelledAt: timestamp, updatedByPersonId: actorId ?? null },
        include: { fulfilments: true },
      });
    });
    // LEAN-P1-9 — propagate CANCELLED → RELEASED onto the mirror position.
    // The reason text is captured on `cancellationReason` for forensic parity
    // with the legacy SR `cancelledAt` timestamp.
    await this.dualWriteProjectPosition(record, actorId, {
      cancellationReason: 'Staffing request cancelled.',
    });
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record, projectName);
  }

  public async update(
    idOrPublicId: string,
    updates: Partial<Pick<StaffingRequest, 'allocationPercent' | 'endDate' | 'headcountRequired' | 'priority' | 'role' | 'skills' | 'startDate' | 'summary'>>,
    actorId?: string,
  ): Promise<StaffingRequest> {
    const id = await this.resolveInternalId(idOrPublicId);
    if (!id) throw new NotFoundException('Staffing request not found.');
    const existing = await this.prisma.staffingRequest.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw new NotFoundException('Staffing request not found.');
    if (existing.status !== 'DRAFT') throw new ConflictException('Can only update DRAFT requests.');

    const data: Record<string, unknown> = {};
    if (updates.allocationPercent !== undefined) data['allocationPercent'] = updates.allocationPercent;
    if (updates.endDate !== undefined) data['endDate'] = new Date(updates.endDate);
    if (updates.headcountRequired !== undefined) data['headcountRequired'] = updates.headcountRequired;
    if (updates.priority !== undefined) data['priority'] = updates.priority;
    if (updates.role !== undefined) data['role'] = updates.role;
    if (updates.skills !== undefined) data['skills'] = updates.skills;
    if (updates.startDate !== undefined) data['startDate'] = new Date(updates.startDate);
    if (updates.summary !== undefined) data['summary'] = updates.summary;
    // F-97 / D-103-write-path — track who edited the row.
    data['updatedByPersonId'] = actorId ?? null;

    // SoT PR 15 — canonical write: update the paired `ProjectPosition`
    // BEFORE updating the legacy `StaffingRequest`. The mirror update
    // pushes the same merged field set so demand-side reads stay in
    // lockstep. Best-effort: if the canonical write fails the legacy
    // update is skipped (callers see the same exception as today).
    await this.updateCanonicalProjectPositionForSr(id, data, actorId);

    const record = await this.prisma.staffingRequest.update({
      where: { id },
      data,
      include: { fulfilments: true },
    });
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record, projectName);
  }

  private toResponse(record: PrismaRecord, projectName: string | undefined): StaffingRequest {
    // DMD-026: every response surface exposes the publicId as the `id` field.
    // Rows created before the DM-2 expand migration fell back to the internal uuid;
    // the `?? record.id` keeps those rows addressable while the rollout lands.
    const effectivePublicId = record.publicId ?? record.id;
    return {
      allocationPercent: record.allocationPercent.toNumber(),
      cancelledAt: record.cancelledAt ? record.cancelledAt.toISOString() : undefined,
      candidatePersonId: record.candidatePersonId ?? undefined,
      createdAt: record.createdAt.toISOString(),
      endDate: record.endDate.toISOString().slice(0, 10),
      fulfilments: record.fulfilments.map((f) => ({
        assignedPersonId: f.assignedPersonId,
        fulfilledAt: f.fulfilledAt.toISOString(),
        id: f.id,
        proposedByPersonId: f.proposedByPersonId,
      })),
      headcountFulfilled: record.headcountFulfilled,
      headcountRequired: record.headcountRequired,
      id: effectivePublicId,
      publicId: effectivePublicId,
      priority: record.priority as StaffingRequestPriority,
      projectId: record.projectId,
      projectName,
      requestedByPersonId: record.requestedByPersonId,
      role: record.role,
      skills: record.skills,
      startDate: record.startDate.toISOString().slice(0, 10),
      status: record.status as StaffingRequestStatus,
      summary: record.summary ?? undefined,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  /**
   * Transitional helper (DM-2.5-8 template §3). Accepts either the internal uuid
   * or the `stf_…` publicId and returns the matching row, or `null` if no match.
   * Removed in DM-2.5-11 when uuid acceptance is dropped and controllers flip to
   * strict `ParsePublicId(AggregateType.StaffingRequest)`.
   */
  private findRecordByIdOrPublicId(idOrPublicId: string) {
    if (/^stf_[A-Za-z0-9]{10,}$/.test(idOrPublicId)) {
      return this.prisma.staffingRequest.findUnique({ where: { publicId: idOrPublicId } });
    }
    return this.prisma.staffingRequest.findUnique({ where: { id: idOrPublicId } });
  }

  private async resolveProjectName(projectId: string): Promise<string | undefined> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    return project?.name;
  }

  private async resolveProjectNames(projectIds: string[]): Promise<Record<string, string>> {
    if (projectIds.length === 0) return {};
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    });
    return Object.fromEntries(projects.map((p) => [p.id, p.name]));
  }

  /**
   * SoT PR 15 — write the canonical `ProjectPosition` row when a brand-new
   * `StaffingRequest` is created. Runs BEFORE the legacy SR insert so the
   * lean side is the source of truth from the first write. The `legacyId`
   * is generated by the caller so the position pins
   * `legacyStaffingRequestId` against a stable id that the legacy mirror
   * write will adopt as its own primary key.
   *
   * Failure semantics: any exception propagates — without a canonical
   * position the legacy SR row would create divergence the parity service
   * is designed to surface. The caller aborts before writing the legacy
   * mirror so no half-state leaks out.
   */
  private async writeCanonicalProjectPositionForSr(
    input: {
      legacyId: string;
      projectId: string;
      role: string;
      skills: string[];
      summary?: string;
      allocationPercent: number;
      startDate: Date;
      endDate: Date;
      priority: StaffingRequestPriority;
      requestedByPersonId: string;
      candidatePersonId: string | null;
      status: StaffingRequestStatus;
    },
    actorId: string,
  ): Promise<void> {
    const fillStatus = mapStaffingRequestStatusToFillStatus(input.status);
    await this.prisma.projectPosition.create({
      data: {
        projectId: input.projectId,
        role: input.role,
        skills: input.skills,
        summary: input.summary ?? null,
        requiredAllocationPercent: input.allocationPercent,
        startDate: input.startDate,
        endDate: input.endDate,
        priority: input.priority,
        requestedByPersonId: input.requestedByPersonId,
        fillStatus,
        // DRAFT positions have no active person; activation flips later
        // via the slate/fulfilment transitions which already mirror
        // forward.
        activePersonId: null,
        activeAllocationPercent: null,
        activeValidFrom: null,
        activeValidTo: null,
        legacyStaffingRequestId: input.legacyId,
        createdByPersonId: actorId,
        updatedByPersonId: actorId,
      },
    });
  }

  /**
   * SoT PR 15 — update the canonical paired `ProjectPosition` BEFORE the
   * legacy `StaffingRequest` row receives the same mutation. Only fires
   * for DRAFT-only field updates (role/skills/dates/allocation/priority/
   * summary/headcountRequired) — terminal transitions stay on the
   * follower-mirror path via `dualWriteProjectPosition` until PR 16
   * drops the legacy table.
   *
   * The merged update is best-effort wrapped: if the paired position is
   * missing (pre-backfill SR or a fresh SR before its position write
   * landed) we skip silently — parity reports the orphan and operators
   * reconcile via the daily snapshot.
   */
  private async updateCanonicalProjectPositionForSr(
    legacySrId: string,
    legacyUpdateData: Record<string, unknown>,
    actorId: string | undefined,
  ): Promise<void> {
    try {
      const existing = await this.prisma.projectPosition.findFirst({
        where: { legacyStaffingRequestId: legacySrId },
        select: { id: true },
      });
      if (!existing) return;
      const positionData: Record<string, unknown> = {
        updatedByPersonId: actorId ?? null,
      };
      if (legacyUpdateData['allocationPercent'] !== undefined) {
        positionData['requiredAllocationPercent'] = legacyUpdateData['allocationPercent'];
      }
      if (legacyUpdateData['endDate'] !== undefined) {
        positionData['endDate'] = legacyUpdateData['endDate'];
      }
      if (legacyUpdateData['priority'] !== undefined) {
        positionData['priority'] = legacyUpdateData['priority'];
      }
      if (legacyUpdateData['role'] !== undefined) {
        positionData['role'] = legacyUpdateData['role'];
      }
      if (legacyUpdateData['skills'] !== undefined) {
        positionData['skills'] = legacyUpdateData['skills'];
      }
      if (legacyUpdateData['startDate'] !== undefined) {
        positionData['startDate'] = legacyUpdateData['startDate'];
      }
      if (legacyUpdateData['summary'] !== undefined) {
        positionData['summary'] = legacyUpdateData['summary'];
      }
      await this.prisma.projectPosition.update({
        where: { id: existing.id },
        data: positionData,
      });
    } catch (err) {
      this.logger.warn(
        `ProjectPosition canonical update failed for SR ${legacySrId} → ${(err as Error).message}`,
      );
    }
  }

  /**
   * LEAN-P1-9 — legacy follower-mirror for non-create/non-update
   * transitions (submit / review / release / cancel / fulfil). Kept until
   * PR 16 drops the legacy table; called AFTER the legacy SR mutation so
   * the lean position stays in lockstep with terminal-state flips that
   * still originate on the legacy side.
   *
   * Best-effort: failures never block the legacy transition write.
   */
  private async dualWriteProjectPosition(
    record: PrismaRecord,
    actorId: string | undefined | null,
    overrides: {
      activePersonId?: string | null;
      cancellationReason?: string | null;
    } = {},
  ): Promise<void> {
    try {
      const fillStatus = mapStaffingRequestStatusToFillStatus(record.status);
      const isActive = fillStatus === 'BOOKED'
        || fillStatus === 'ONBOARDING'
        || fillStatus === 'ASSIGNED'
        || fillStatus === 'ON_HOLD';

      // Single mirror position per SR — match on legacyStaffingRequestId
      // (indexed, not unique because headcount > 1 may spawn N positions via
      // GenerateStaffingRequestsFromPlanService).
      const existing = await this.prisma.projectPosition.findFirst({
        where: { legacyStaffingRequestId: record.id },
        select: { id: true },
      });

      const activePersonId = overrides.activePersonId
        ?? (isActive ? record.candidatePersonId ?? null : null);

      const baseFields = {
        projectId: record.projectId,
        role: record.role,
        skills: record.skills,
        summary: record.summary,
        requiredAllocationPercent: record.allocationPercent,
        startDate: record.startDate,
        endDate: record.endDate,
        priority: record.priority,
        requestedByPersonId: record.requestedByPersonId,
        fillStatus,
        activePersonId,
        activeAllocationPercent: isActive ? record.allocationPercent : null,
        activeValidFrom: isActive ? record.createdAt : null,
        activeValidTo: isActive ? record.endDate : null,
        cancellationReason: overrides.cancellationReason ?? null,
        // D-103-write-path — actor on every mirror write. NULL only when the
        // legacy SR write also had no actor (e.g. legacy `create` falls back
        // to the requester).
        updatedByPersonId: actorId ?? null,
      };

      if (existing) {
        await this.prisma.projectPosition.update({
          where: { id: existing.id },
          data: baseFields,
        });
        return;
      }

      await this.prisma.projectPosition.create({
        data: {
          ...baseFields,
          tenantId: record.tenantId ?? null,
          legacyStaffingRequestId: record.id,
          createdByPersonId: actorId ?? record.requestedByPersonId,
        },
      });
    } catch (err) {
      this.logger.warn(
        `ProjectPosition dual-write failed for staffing request ${record.id} → ${(err as Error).message}`,
      );
    }
  }
}
