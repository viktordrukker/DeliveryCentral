import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  CreatePlannerScenarioRequestDto,
  PlannerScenarioDto,
  PlannerScenarioStateDto,
  UpdatePlannerScenarioRequestDto,
} from './contracts/planner-scenario.dto';

/**
 * FE-#266 — PlannerScenario CRUD on the existing Phase-21 model.
 *
 * The Prisma model already exists; this service just adds the lifecycle
 * surface (list / get / create / update / delete). "Apply scenario
 * transactionally" is filed separately as #269.
 *
 * Owner / admin semantics on PATCH and DELETE:
 *   - The scenario owner (createdByPersonId) can always modify.
 *   - The `admin` role can modify any scenario.
 *   - Archived scenarios refuse modifications.
 */
@Injectable()
export class PlannerScenarioService {
  public constructor(private readonly prisma: PrismaService) {}

  public async list(args: { ownerId?: string }): Promise<PlannerScenarioDto[]> {
    const rows = await this.prisma.plannerScenario.findMany({
      where: {
        archivedAt: null,
        ...(args.ownerId ? { createdByPersonId: args.ownerId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return rows.map(toDto);
  }

  public async getById(id: string): Promise<PlannerScenarioDto> {
    const row = await this.prisma.plannerScenario.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`PlannerScenario ${id} not found.`);
    return toDto(row);
  }

  public async create(
    actorId: string,
    body: CreatePlannerScenarioRequestDto,
  ): Promise<PlannerScenarioDto> {
    const row = await this.prisma.plannerScenario.create({
      data: {
        createdByPersonId: actorId,
        name: body.name,
        description: body.description ?? null,
        state: (body.state ?? { proposedAssignments: [] }) as unknown as Prisma.JsonObject,
      },
    });
    return toDto(row);
  }

  public async update(
    id: string,
    callerPersonId: string,
    callerRoles: readonly string[],
    body: UpdatePlannerScenarioRequestDto,
  ): Promise<PlannerScenarioDto> {
    const row = await this.prisma.plannerScenario.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`PlannerScenario ${id} not found.`);
    this.assertOwnerOrAdmin(row.createdByPersonId, callerPersonId, callerRoles);
    if (row.archivedAt !== null) {
      throw new ForbiddenException('Archived scenarios cannot be modified.');
    }
    const updated = await this.prisma.plannerScenario.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.state !== undefined
          ? { state: body.state as unknown as Prisma.JsonObject }
          : {}),
      },
    });
    return toDto(updated);
  }

  public async delete(
    id: string,
    callerPersonId: string,
    callerRoles: readonly string[],
  ): Promise<void> {
    const row = await this.prisma.plannerScenario.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`PlannerScenario ${id} not found.`);
    this.assertOwnerOrAdmin(row.createdByPersonId, callerPersonId, callerRoles);
    // Soft-delete via archivedAt so the row is still inspectable in audit.
    await this.prisma.plannerScenario.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  private assertOwnerOrAdmin(
    ownerId: string,
    callerPersonId: string,
    callerRoles: readonly string[],
  ): void {
    if (ownerId === callerPersonId) return;
    if (callerRoles.includes('admin')) return;
    throw new ForbiddenException('Only the scenario owner or an admin can perform this action.');
  }
}

function toDto(row: {
  id: string;
  name: string;
  description: string | null;
  createdByPersonId: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  state: unknown;
  summaryAssignments: number;
  summaryHires: number;
  summaryReleases: number;
  summaryExtensions: number;
  summaryAnomalies: number;
}): PlannerScenarioDto {
  const state = isStateObject(row.state) ? row.state : { proposedAssignments: [] };
  return {
    id: row.id,
    ownerId: row.createdByPersonId,
    name: row.name,
    description: row.description,
    state: {
      proposedAssignments: Array.isArray(state.proposedAssignments)
        ? state.proposedAssignments
        : [],
      baselineSnapshotId:
        typeof state.baselineSnapshotId === 'string' ? state.baselineSnapshotId : null,
    },
    summary: {
      assignments: row.summaryAssignments,
      hires: row.summaryHires,
      releases: row.summaryReleases,
      extensions: row.summaryExtensions,
      anomalies: row.summaryAnomalies,
    },
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isStateObject(v: unknown): v is PlannerScenarioStateDto {
  return v !== null && typeof v === 'object';
}
