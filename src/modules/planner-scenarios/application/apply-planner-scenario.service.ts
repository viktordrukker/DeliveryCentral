import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

interface ApplyResult {
  applied: number;
  scenarioId: string;
  errors: string[];
}

interface ProposedAssignment {
  positionId: string;
  personId: string;
  startDate: string;
  endDate: string;
  allocationPercent: number;
}

/**
 * FE-#269 — apply a planner scenario transactionally.
 *
 * Reads scenario.state.proposedAssignments, iterates each and writes
 * a corresponding ProjectAssignment row inside a single prisma.$transaction.
 * Any single failure rolls back the entire batch — atomic semantics so
 * the staffing state never lands half-applied.
 *
 * For each proposed assignment, write a row in AssignmentHistory with
 * changeType='APPLIED_FROM_SCENARIO' and reason carrying the scenarioId
 * for audit traceability.
 *
 * On success, the scenario's `archivedAt` is set (we don't have a status
 * column on the existing Phase-21 model; archive marks it consumed).
 *
 * 409 Conflict if the scenario is already archived (already applied).
 * EXEC_ROLES enforcement is at the controller layer.
 */
@Injectable()
export class ApplyPlannerScenarioService {
  public constructor(private readonly prisma: PrismaService) {}

  public async apply(scenarioId: string, actorId: string): Promise<ApplyResult> {
    const scenario = await this.prisma.plannerScenario.findUnique({
      where: { id: scenarioId },
      select: { id: true, state: true, archivedAt: true, createdByPersonId: true },
    });
    if (!scenario) {
      throw new NotFoundException(`PlannerScenario ${scenarioId} not found.`);
    }
    if (scenario.archivedAt !== null) {
      throw new ConflictException(
        `Scenario ${scenarioId} is already archived/applied; cannot reapply.`,
      );
    }

    const proposed = readProposedAssignments(scenario.state);
    if (proposed.length === 0) {
      throw new ForbiddenException('Scenario has no proposed assignments to apply.');
    }

    // Pre-resolve every position → projectId so we can fail fast outside
    // the transaction if any positionId is bogus, and to avoid N+1 inside.
    const positionIds = [...new Set(proposed.map((p) => p.positionId))];
    const positions = await this.prisma.projectPosition.findMany({
      where: { id: { in: positionIds } },
      select: { id: true, projectId: true, role: true },
    });
    const positionIndex = new Map(positions.map((pos) => [pos.id, pos]));
    const missing = positionIds.filter((id) => !positionIndex.has(id));
    if (missing.length > 0) {
      return {
        applied: 0,
        scenarioId,
        errors: [`Unknown positionId(s): ${missing.join(', ')}`],
      };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const p of proposed) {
          const startDate = new Date(p.startDate);
          const endDate = new Date(p.endDate);
          const allocation = new Prisma.Decimal(p.allocationPercent);
          // SoT PR 16b — canonical-only write to ProjectPosition. The
          // scenario's `positionId` is the canonical aggregate id; we
          // book the active fill in-place rather than spawning a paired
          // legacy ProjectAssignment row.
          const updated = await tx.projectPosition.update({
            where: { id: p.positionId },
            data: {
              fillStatus: 'BOOKED',
              activePersonId: p.personId,
              activeAllocationPercent: allocation,
              activeValidFrom: startDate,
              activeValidTo: endDate,
              updatedByPersonId: actorId,
            },
          });
          await tx.projectPositionFillHistory.create({
            data: {
              positionId: p.positionId,
              changeType: 'ASSIGNED',
              changedByPersonId: actorId,
              changeReason: `planner_scenario_applied:${scenarioId}`,
              newPersonId: p.personId,
              newStatus: 'BOOKED',
              newSnapshot: updated as unknown as Prisma.JsonObject,
            },
          });
        }
        await tx.plannerScenario.update({
          where: { id: scenarioId },
          data: { archivedAt: new Date(), updatedByPersonId: actorId },
        });
      });
    } catch (err) {
      // Anything inside the transaction throws → entire batch rolled back.
      // Return the error to the caller as part of the result (no partial state).
      return {
        applied: 0,
        scenarioId,
        errors: [(err as Error).message],
      };
    }

    return { applied: proposed.length, scenarioId, errors: [] };
  }
}

function readProposedAssignments(state: unknown): ProposedAssignment[] {
  if (state === null || typeof state !== 'object') return [];
  const arr = (state as { proposedAssignments?: unknown }).proposedAssignments;
  if (!Array.isArray(arr)) return [];
  return arr.filter(isProposed);
}

function isProposed(v: unknown): v is ProposedAssignment {
  if (v === null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.positionId === 'string' &&
    typeof o.personId === 'string' &&
    typeof o.startDate === 'string' &&
    typeof o.endDate === 'string' &&
    typeof o.allocationPercent === 'number'
  );
}
