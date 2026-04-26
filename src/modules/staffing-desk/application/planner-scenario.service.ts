import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

/* ── DTOs ── */

export interface PlannerScenarioSummaryDto {
  id: string;
  name: string;
  description: string | null;
  createdByPersonId: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  summaryAssignments: number;
  summaryHires: number;
  summaryReleases: number;
  summaryExtensions: number;
  summaryAnomalies: number;
  horizonFrom: string | null;
  horizonWeeks: number | null;
}

export interface PlannerScenarioDetailDto extends PlannerScenarioSummaryDto {
  state: unknown;
}

export interface CreatePlannerScenarioDto {
  actorId: string;
  name: string;
  description?: string;
  state: unknown;
  summaryAssignments: number;
  summaryHires: number;
  summaryReleases: number;
  summaryExtensions: number;
  summaryAnomalies: number;
  horizonFrom?: string;
  horizonWeeks?: number;
}

export interface UpdatePlannerScenarioDto {
  name?: string;
  description?: string;
  state?: unknown;
  summaryAssignments?: number;
  summaryHires?: number;
  summaryReleases?: number;
  summaryExtensions?: number;
  summaryAnomalies?: number;
}

@Injectable()
export class PlannerScenarioService {
  public constructor(private readonly prisma: PrismaService) {}

  public async list(): Promise<PlannerScenarioSummaryDto[]> {
    const rows = await this.prisma.plannerScenario.findMany({
      where: { archivedAt: null },
      select: {
        id: true, name: true, description: true, createdByPersonId: true,
        createdAt: true, updatedAt: true,
        summaryAssignments: true, summaryHires: true, summaryReleases: true,
        summaryExtensions: true, summaryAnomalies: true,
        horizonFrom: true, horizonWeeks: true,
        createdBy: { select: { displayName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdByPersonId: r.createdByPersonId,
      createdByName: r.createdBy?.displayName ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      summaryAssignments: r.summaryAssignments,
      summaryHires: r.summaryHires,
      summaryReleases: r.summaryReleases,
      summaryExtensions: r.summaryExtensions,
      summaryAnomalies: r.summaryAnomalies,
      horizonFrom: r.horizonFrom ? r.horizonFrom.toISOString().slice(0, 10) : null,
      horizonWeeks: r.horizonWeeks,
    }));
  }

  public async get(id: string): Promise<PlannerScenarioDetailDto> {
    const row = await this.prisma.plannerScenario.findUnique({
      where: { id },
      include: { createdBy: { select: { displayName: true } } },
    });
    if (!row || row.archivedAt) throw new NotFoundException(`Scenario ${id} not found`);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdByPersonId: row.createdByPersonId,
      createdByName: row.createdBy?.displayName ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      summaryAssignments: row.summaryAssignments,
      summaryHires: row.summaryHires,
      summaryReleases: row.summaryReleases,
      summaryExtensions: row.summaryExtensions,
      summaryAnomalies: row.summaryAnomalies,
      horizonFrom: row.horizonFrom ? row.horizonFrom.toISOString().slice(0, 10) : null,
      horizonWeeks: row.horizonWeeks,
      state: row.state,
    };
  }

  public async create(dto: CreatePlannerScenarioDto): Promise<PlannerScenarioDetailDto> {
    const created = await this.prisma.plannerScenario.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        createdByPersonId: dto.actorId,
        state: dto.state as object,
        summaryAssignments: dto.summaryAssignments,
        summaryHires: dto.summaryHires,
        summaryReleases: dto.summaryReleases,
        summaryExtensions: dto.summaryExtensions,
        summaryAnomalies: dto.summaryAnomalies,
        horizonFrom: dto.horizonFrom ? new Date(dto.horizonFrom) : null,
        horizonWeeks: dto.horizonWeeks ?? null,
      },
    });
    return this.get(created.id);
  }

  public async update(id: string, dto: UpdatePlannerScenarioDto): Promise<PlannerScenarioDetailDto> {
    const existing = await this.prisma.plannerScenario.findUnique({ where: { id }, select: { id: true, archivedAt: true } });
    if (!existing || existing.archivedAt) throw new NotFoundException(`Scenario ${id} not found`);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.state !== undefined) data.state = dto.state as object;
    if (dto.summaryAssignments !== undefined) data.summaryAssignments = dto.summaryAssignments;
    if (dto.summaryHires !== undefined) data.summaryHires = dto.summaryHires;
    if (dto.summaryReleases !== undefined) data.summaryReleases = dto.summaryReleases;
    if (dto.summaryExtensions !== undefined) data.summaryExtensions = dto.summaryExtensions;
    if (dto.summaryAnomalies !== undefined) data.summaryAnomalies = dto.summaryAnomalies;

    await this.prisma.plannerScenario.update({ where: { id }, data });
    return this.get(id);
  }

  public async archive(id: string): Promise<{ archived: boolean }> {
    const existing = await this.prisma.plannerScenario.findUnique({ where: { id }, select: { id: true, archivedAt: true } });
    if (!existing) throw new NotFoundException(`Scenario ${id} not found`);
    if (existing.archivedAt) return { archived: true };
    await this.prisma.plannerScenario.update({ where: { id }, data: { archivedAt: new Date() } });
    return { archived: true };
  }
}
