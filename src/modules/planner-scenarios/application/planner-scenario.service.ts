import { ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PlannerScenarioStatus, Prisma } from '@prisma/client';

import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  CreatePlannerScenarioRequestDto,
  PlannerScenarioDto,
  PlannerScenarioStateDto,
  PlannerScenarioStatusLiteral,
  UpdatePlannerScenarioRequestDto,
} from './contracts/planner-scenario.dto';

/**
 * FE-#266 + LEAN-P4a-1 — PlannerScenario CRUD on the Phase-21 model.
 *
 * The Prisma model already exists; this service is the lifecycle surface
 * (list / get / create / update / cancel). "Apply scenario transactionally"
 * lives in #269 (`ApplyPlannerScenarioService`).
 *
 * Owner / admin semantics on PATCH and DELETE:
 *   - The scenario owner (`createdByPersonId`) can always modify.
 *   - The `admin` role can modify any scenario.
 *   - Cancelled scenarios refuse modifications (status === CANCELLED).
 *
 * LEAN-P4a-1 additions:
 *   - `status` enum lifecycle (DRAFT → SUBMITTED → APPLIED → CANCELLED).
 *   - Soft-cancel via `status = CANCELLED` (preserved alongside legacy
 *     `archivedAt` so existing readers keep working).
 *   - `updatedByPersonId` audit threading on every mutation.
 *   - `publicId` egress (DM-2.5).
 */
@Injectable()
export class PlannerScenarioService {
  public constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly translator?: NotificationEventTranslatorService,
  ) {}

  public async list(args: {
    ownerId?: string;
    status?: PlannerScenarioStatusLiteral;
    limit?: number;
  }): Promise<PlannerScenarioDto[]> {
    const rows = await this.prisma.plannerScenario.findMany({
      where: {
        ...(args.status
          ? { status: args.status as PlannerScenarioStatus }
          : { status: { not: PlannerScenarioStatus.CANCELLED } }),
        ...(args.ownerId ? { createdByPersonId: args.ownerId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(args.limit ?? 100, 500),
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
    const summary = body.summary ?? {
      assignments: 0,
      hires: 0,
      releases: 0,
      extensions: 0,
      anomalies: 0,
    };
    const row = await this.prisma.plannerScenario.create({
      data: {
        createdByPersonId: actorId,
        updatedByPersonId: actorId,
        name: body.name,
        description: body.description ?? null,
        state: (body.state ?? { proposedAssignments: [] }) as unknown as Prisma.JsonObject,
        summaryAssignments: summary.assignments,
        summaryHires: summary.hires,
        summaryReleases: summary.releases,
        summaryExtensions: summary.extensions,
        summaryAnomalies: summary.anomalies,
      },
    });
    await this.translator?.scenarioCreated({
      scenarioId: row.id,
      actorPersonId: actorId,
      name: row.name,
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
    if (row.status === PlannerScenarioStatus.CANCELLED) {
      throw new ForbiddenException('Cancelled scenarios cannot be modified.');
    }
    const updated = await this.prisma.plannerScenario.update({
      where: { id },
      data: {
        updatedByPersonId: callerPersonId,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.state !== undefined
          ? { state: body.state as unknown as Prisma.JsonObject }
          : {}),
        ...(body.status !== undefined ? { status: body.status as PlannerScenarioStatus } : {}),
      },
    });
    const fields: string[] = [];
    if (body.name !== undefined) fields.push('name');
    if (body.description !== undefined) fields.push('description');
    if (body.state !== undefined) fields.push('state');
    if (body.status !== undefined) fields.push('status');
    await this.translator?.scenarioUpdated({
      scenarioId: updated.id,
      actorPersonId: callerPersonId,
      fields,
    });
    return toDto(updated);
  }

  public async cancel(
    id: string,
    callerPersonId: string,
    callerRoles: readonly string[],
  ): Promise<PlannerScenarioDto> {
    const row = await this.prisma.plannerScenario.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`PlannerScenario ${id} not found.`);
    this.assertOwnerOrAdmin(row.createdByPersonId, callerPersonId, callerRoles);
    if (row.status === PlannerScenarioStatus.CANCELLED) {
      return toDto(row);
    }
    const updated = await this.prisma.plannerScenario.update({
      where: { id },
      data: {
        status: PlannerScenarioStatus.CANCELLED,
        archivedAt: new Date(),
        updatedByPersonId: callerPersonId,
      },
    });
    await this.translator?.scenarioCancelled({
      scenarioId: updated.id,
      actorPersonId: callerPersonId,
    });
    return toDto(updated);
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

interface PlannerScenarioRow {
  id: string;
  publicId: string | null;
  tenantId: string | null;
  name: string;
  description: string | null;
  status: PlannerScenarioStatus;
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
}

function toDto(row: PlannerScenarioRow): PlannerScenarioDto {
  const state = isStateObject(row.state) ? row.state : { proposedAssignments: [] };
  return {
    id: row.id,
    publicId: row.publicId,
    ownerId: row.createdByPersonId,
    tenantId: row.tenantId,
    status: row.status,
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
