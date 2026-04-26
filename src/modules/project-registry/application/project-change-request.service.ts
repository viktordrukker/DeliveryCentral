import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChangeRequestSeverity, ChangeRequestStatus } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectChangeRequestDto } from './contracts/radiator.dto';

export interface CreateChangeRequestDto {
  title: string;
  description?: string | null;
  severity?: ChangeRequestSeverity;
  outOfBaseline?: boolean;
  impactScope?: string | null;
  impactSchedule?: string | null;
  impactBudget?: string | null;
  requesterPersonId?: string | null;
}

export interface UpdateChangeRequestDto {
  title?: string;
  description?: string | null;
  severity?: ChangeRequestSeverity;
  outOfBaseline?: boolean;
  impactScope?: string | null;
  impactSchedule?: string | null;
  impactBudget?: string | null;
}

export interface ListChangeRequestsFilter {
  projectId?: string;
  status?: ChangeRequestStatus;
  severity?: ChangeRequestSeverity;
  outOfBaseline?: boolean;
}

const SEVERITY_WEIGHT: Record<ChangeRequestSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

@Injectable()
export class ProjectChangeRequestService {
  public constructor(private readonly prisma: PrismaService) {}

  public async list(filter: ListChangeRequestsFilter = {}): Promise<ProjectChangeRequestDto[]> {
    const rows = await this.prisma.projectChangeRequest.findMany({
      where: {
        projectId: filter.projectId,
        status: filter.status,
        severity: filter.severity,
        outOfBaseline: filter.outOfBaseline,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  public async getById(id: string): Promise<ProjectChangeRequestDto> {
    const row = await this.prisma.projectChangeRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Change request not found.');
    return this.toDto(row);
  }

  public async create(projectId: string, dto: CreateChangeRequestDto): Promise<ProjectChangeRequestDto> {
    if (!dto.title || dto.title.trim().length === 0) throw new BadRequestException('title is required');

    const row = await this.prisma.projectChangeRequest.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description ?? null,
        severity: dto.severity ?? ChangeRequestSeverity.MEDIUM,
        outOfBaseline: dto.outOfBaseline ?? false,
        impactScope: dto.impactScope ?? null,
        impactSchedule: dto.impactSchedule ?? null,
        impactBudget: dto.impactBudget ?? null,
        requesterPersonId: dto.requesterPersonId ?? null,
      },
    });
    return this.toDto(row);
  }

  public async update(id: string, dto: UpdateChangeRequestDto): Promise<ProjectChangeRequestDto> {
    const existing = await this.prisma.projectChangeRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Change request not found.');

    const row = await this.prisma.projectChangeRequest.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        description: dto.description !== undefined ? dto.description : existing.description,
        severity: dto.severity ?? existing.severity,
        outOfBaseline: dto.outOfBaseline ?? existing.outOfBaseline,
        impactScope: dto.impactScope !== undefined ? dto.impactScope : existing.impactScope,
        impactSchedule:
          dto.impactSchedule !== undefined ? dto.impactSchedule : existing.impactSchedule,
        impactBudget: dto.impactBudget !== undefined ? dto.impactBudget : existing.impactBudget,
      },
    });
    return this.toDto(row);
  }

  public async approve(id: string, decidedByPersonId: string): Promise<ProjectChangeRequestDto> {
    const existing = await this.prisma.projectChangeRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Change request not found.');
    if (existing.status !== ChangeRequestStatus.PROPOSED) {
      throw new BadRequestException(`Cannot approve change request in status ${existing.status}`);
    }
    const row = await this.prisma.projectChangeRequest.update({
      where: { id },
      data: {
        status: ChangeRequestStatus.APPROVED,
        decidedByPersonId,
        decidedAt: new Date(),
      },
    });
    return this.toDto(row);
  }

  public async reject(id: string, decidedByPersonId: string): Promise<ProjectChangeRequestDto> {
    const existing = await this.prisma.projectChangeRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Change request not found.');
    if (existing.status !== ChangeRequestStatus.PROPOSED) {
      throw new BadRequestException(`Cannot reject change request in status ${existing.status}`);
    }
    const row = await this.prisma.projectChangeRequest.update({
      where: { id },
      data: {
        status: ChangeRequestStatus.REJECTED,
        decidedByPersonId,
        decidedAt: new Date(),
      },
    });
    return this.toDto(row);
  }

  public async remove(id: string): Promise<void> {
    const existing = await this.prisma.projectChangeRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Change request not found.');
    await this.prisma.projectChangeRequest.delete({ where: { id } });
  }

  // ── Signal helpers for the radiator ───────────────────────────────────────

  /** Requirements stability = 1 - (approved CRs in last 28d / baselineRequirements). */
  public async stabilityLast4w(
    projectId: string,
    baselineRequirements: number,
  ): Promise<{ value: number | null; explanation: string }> {
    const size = Math.max(1, baselineRequirements);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 28);

    const approvedCount = await this.prisma.projectChangeRequest.count({
      where: {
        projectId,
        status: ChangeRequestStatus.APPROVED,
        decidedAt: { gte: since },
      },
    });

    const ratio = Math.max(0, 1 - approvedCount / size);
    return {
      value: ratio,
      explanation: `${Math.round(ratio * 100)}% requirements stable (${approvedCount} approved CRs in last 28d vs baseline ${size})`,
    };
  }

  /** Scope creep ratio = lifetime approved out-of-baseline CRs / baselineRequirements. */
  public async creepRatio(
    projectId: string,
    baselineRequirements: number,
  ): Promise<{ value: number | null; explanation: string }> {
    const size = Math.max(1, baselineRequirements);
    const oobCount = await this.prisma.projectChangeRequest.count({
      where: {
        projectId,
        status: ChangeRequestStatus.APPROVED,
        outOfBaseline: true,
      },
    });

    const ratio = oobCount / size;
    return {
      value: ratio,
      explanation: `${oobCount} out-of-baseline CRs approved vs baseline ${size} (${Math.round(ratio * 100)}%)`,
    };
  }

  /** Change-request burden = Σ severity weights for PROPOSED CRs. Returns raw sum + project size. */
  public async burden(
    projectId: string,
    baselineRequirements: number,
  ): Promise<{ value: number | null; extra: { size: number }; explanation: string }> {
    const size = Math.max(1, baselineRequirements);
    const proposed = await this.prisma.projectChangeRequest.findMany({
      where: { projectId, status: ChangeRequestStatus.PROPOSED },
      select: { severity: true },
    });

    const weighted = proposed.reduce(
      (sum, cr) => sum + (SEVERITY_WEIGHT[cr.severity as ChangeRequestSeverity] ?? 1),
      0,
    );

    return {
      value: weighted,
      extra: { size },
      explanation: `${proposed.length} proposed CR(s) with severity-weight ${weighted} vs size ${size}`,
    };
  }

  private toDto(row: {
    id: string;
    projectId: string;
    title: string;
    description: string | null;
    status: ChangeRequestStatus;
    severity: ChangeRequestSeverity;
    outOfBaseline: boolean;
    impactScope: string | null;
    impactSchedule: string | null;
    impactBudget: string | null;
    requesterPersonId: string | null;
    decidedByPersonId: string | null;
    decidedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ProjectChangeRequestDto {
    return {
      id: row.id,
      projectId: row.projectId,
      title: row.title,
      description: row.description,
      status: row.status,
      severity: row.severity,
      outOfBaseline: row.outOfBaseline,
      impactScope: row.impactScope,
      impactSchedule: row.impactSchedule,
      impactBudget: row.impactBudget,
      requesterPersonId: row.requesterPersonId,
      decidedByPersonId: row.decidedByPersonId,
      decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
