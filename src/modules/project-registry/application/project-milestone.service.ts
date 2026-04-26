import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MilestoneStatus } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectMilestoneDto } from './contracts/radiator.dto';

export interface CreateMilestoneDto {
  name: string;
  description?: string | null;
  plannedDate: string;
  status?: MilestoneStatus;
}

export interface UpdateMilestoneDto {
  name?: string;
  description?: string | null;
  plannedDate?: string;
  actualDate?: string | null;
  status?: MilestoneStatus;
  progressPct?: number;
  dependsOnMilestoneIds?: string[];
}

@Injectable()
export class ProjectMilestoneService {
  public constructor(private readonly prisma: PrismaService) {}

  public async list(projectId: string): Promise<ProjectMilestoneDto[]> {
    const rows = await this.prisma.projectMilestone.findMany({
      where: { projectId },
      orderBy: { plannedDate: 'asc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  public async getById(id: string): Promise<ProjectMilestoneDto> {
    const row = await this.prisma.projectMilestone.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Milestone not found.');
    return this.toDto(row);
  }

  public async create(projectId: string, dto: CreateMilestoneDto): Promise<ProjectMilestoneDto> {
    if (!dto.name || dto.name.trim().length === 0) throw new BadRequestException('name is required');
    if (!dto.plannedDate) throw new BadRequestException('plannedDate is required');

    const row = await this.prisma.projectMilestone.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description ?? null,
        plannedDate: new Date(dto.plannedDate),
        status: dto.status ?? MilestoneStatus.PLANNED,
      },
    });
    return this.toDto(row);
  }

  public async update(id: string, dto: UpdateMilestoneDto): Promise<ProjectMilestoneDto> {
    const existing = await this.prisma.projectMilestone.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Milestone not found.');

    const row = await this.prisma.projectMilestone.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description !== undefined ? dto.description : existing.description,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : existing.plannedDate,
        actualDate:
          dto.actualDate === null
            ? null
            : dto.actualDate !== undefined
              ? new Date(dto.actualDate)
              : existing.actualDate,
        status: dto.status ?? existing.status,
        ...(dto.progressPct !== undefined
          ? { progressPct: Math.max(0, Math.min(100, dto.progressPct)) }
          : {}),
        ...(dto.dependsOnMilestoneIds !== undefined
          ? { dependsOnMilestoneIds: dto.dependsOnMilestoneIds }
          : {}),
      },
    });
    return this.toDto(row);
  }

  public async remove(id: string): Promise<void> {
    const existing = await this.prisma.projectMilestone.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Milestone not found.');
    await this.prisma.projectMilestone.delete({ where: { id } });
  }

  /**
   * Signal helper used by the radiator: hit-rate of milestones whose plannedDate falls
   * within the last `windowDays` (default 56).
   */
  public async hitRateLast56d(
    projectId: string,
    windowDays = 56,
  ): Promise<{ hits: number; total: number; ratio: number | null }> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - windowDays);

    const recent = await this.prisma.projectMilestone.findMany({
      where: {
        projectId,
        plannedDate: { gte: since },
      },
      select: { plannedDate: true, actualDate: true, status: true },
    });

    const total = recent.length;
    const hits = recent.filter(
      (m) =>
        m.status === MilestoneStatus.HIT &&
        m.actualDate !== null &&
        m.actualDate.getTime() <= m.plannedDate.getTime(),
    ).length;

    return {
      hits,
      total,
      ratio: total > 0 ? hits / total : null,
    };
  }

  private toDto(row: {
    id: string;
    projectId: string;
    name: string;
    description: string | null;
    plannedDate: Date;
    actualDate: Date | null;
    status: MilestoneStatus;
    progressPct?: number;
    dependsOnMilestoneIds?: string[];
    createdAt: Date;
    updatedAt: Date;
  }): ProjectMilestoneDto {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      description: row.description,
      plannedDate: row.plannedDate.toISOString().slice(0, 10),
      actualDate: row.actualDate ? row.actualDate.toISOString().slice(0, 10) : null,
      status: row.status,
      progressPct: row.progressPct ?? 0,
      dependsOnMilestoneIds: row.dependsOnMilestoneIds ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
