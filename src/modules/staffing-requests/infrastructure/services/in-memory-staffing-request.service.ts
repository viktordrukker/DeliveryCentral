import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '@src/shared/persistence/prisma.service';

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

// Prisma maps `@db.Decimal(5, 2)` to the runtime Decimal class (imported
// from @prisma/client/runtime/library); expose it as `any` here to
// avoid cross-cutting type wiring at this transitional point. Callers
// convert via `.toNumber()`.
interface PrismaRecord {
  allocationPercent: { toNumber(): number };
  cancelledAt: Date | null;
  createdAt: Date;
  endDate: Date;
  fulfilments: { assignedPersonId: string; fulfilledAt: Date; id: string; proposedByPersonId: string }[];
  headcountFulfilled: number;
  headcountRequired: number;
  id: string;
  publicId: string | null;
  priority: string;
  projectId: string;
  requestedByPersonId: string;
  role: string;
  skills: string[];
  startDate: Date;
  status: string;
  summary: string | null;
  updatedAt: Date;
}

@Injectable()
export class InMemoryStaffingRequestService {
  public constructor(private readonly prisma: PrismaService) {}

  public async create(command: CreateStaffingRequestCommand): Promise<StaffingRequest> {
    const record = await this.prisma.staffingRequest.create({
      data: {
        allocationPercent: command.allocationPercent,
        endDate: new Date(command.endDate),
        headcountRequired: command.headcountRequired ?? 1,
        priority: command.priority,
        projectId: command.projectId,
        requestedByPersonId: command.requestedByPersonId,
        role: command.role,
        skills: command.skills ?? [],
        startDate: new Date(command.startDate),
        status: 'DRAFT',
        summary: command.summary,
      },
      include: { fulfilments: true },
    });
    const projectName = await this.resolveProjectName(command.projectId);
    return this.toResponse(record as unknown as PrismaRecord, projectName);
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

    return records.map((r) => this.toResponse(r as unknown as PrismaRecord, projectNameMap[r.projectId]));
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
    return this.toResponse(record as unknown as PrismaRecord, projectName);
  }

  public async submit(idOrPublicId: string): Promise<StaffingRequest> {
    const id = await this.resolveInternalId(idOrPublicId);
    if (!id) throw new NotFoundException('Staffing request not found.');
    const existing = await this.prisma.staffingRequest.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw new NotFoundException('Staffing request not found.');
    if (existing.status !== 'DRAFT') throw new ConflictException(`Cannot submit from status ${existing.status}.`);
    const record = await this.prisma.staffingRequest.update({
      where: { id },
      data: { status: 'OPEN' },
      include: { fulfilments: true },
    });
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record as unknown as PrismaRecord, projectName);
  }

  public async review(idOrPublicId: string): Promise<StaffingRequest> {
    const id = await this.resolveInternalId(idOrPublicId);
    if (!id) throw new NotFoundException('Staffing request not found.');
    const existing = await this.prisma.staffingRequest.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw new NotFoundException('Staffing request not found.');
    if (existing.status !== 'OPEN') throw new ConflictException(`Cannot review from status ${existing.status}.`);
    const record = await this.prisma.staffingRequest.update({
      where: { id },
      data: { status: 'IN_REVIEW' },
      include: { fulfilments: true },
    });
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record as unknown as PrismaRecord, projectName);
  }

  public async release(idOrPublicId: string): Promise<StaffingRequest> {
    const id = await this.resolveInternalId(idOrPublicId);
    if (!id) throw new NotFoundException('Staffing request not found.');
    const existing = await this.prisma.staffingRequest.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw new NotFoundException('Staffing request not found.');
    if (existing.status !== 'IN_REVIEW') throw new ConflictException(`Cannot release from status ${existing.status}.`);
    const record = await this.prisma.staffingRequest.update({
      where: { id },
      data: { status: 'OPEN' },
      include: { fulfilments: true },
    });
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record as unknown as PrismaRecord, projectName);
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
      },
    });

    const record = await this.prisma.staffingRequest.update({
      where: { id },
      data: { headcountFulfilled: newFulfilled, status: newStatus },
      include: { fulfilments: true },
    });
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record as unknown as PrismaRecord, projectName);
  }

  public async cancel(idOrPublicId: string): Promise<StaffingRequest> {
    const id = await this.resolveInternalId(idOrPublicId);
    if (!id) throw new NotFoundException('Staffing request not found.');
    const existing = await this.prisma.staffingRequest.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw new NotFoundException('Staffing request not found.');
    if (existing.status === 'FULFILLED' || existing.status === 'CANCELLED') {
      throw new ConflictException(`Cannot cancel from status ${existing.status}.`);
    }
    const record = await this.prisma.staffingRequest.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: { fulfilments: true },
    });
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record as unknown as PrismaRecord, projectName);
  }

  public async update(
    idOrPublicId: string,
    updates: Partial<Pick<StaffingRequest, 'allocationPercent' | 'endDate' | 'headcountRequired' | 'priority' | 'role' | 'skills' | 'startDate' | 'summary'>>,
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

    const record = await this.prisma.staffingRequest.update({
      where: { id },
      data,
      include: { fulfilments: true },
    });
    const projectName = await this.resolveProjectName(record.projectId);
    return this.toResponse(record as unknown as PrismaRecord, projectName);
  }

  private toResponse(record: PrismaRecord, projectName: string | undefined): StaffingRequest {
    // DMD-026: every response surface exposes the publicId as the `id` field.
    // Rows created before the DM-2 expand migration fell back to the internal uuid;
    // the `?? record.id` keeps those rows addressable while the rollout lands.
    const effectivePublicId = record.publicId ?? record.id;
    return {
      allocationPercent: record.allocationPercent.toNumber(),
      cancelledAt: record.cancelledAt ? record.cancelledAt.toISOString() : undefined,
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
}
