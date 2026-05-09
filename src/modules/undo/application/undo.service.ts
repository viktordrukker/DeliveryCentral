import {
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { UndoActionExecutorRegistry, UndoActionRow } from './undo-action-executor.registry';

const DEFAULT_TTL_SECONDS = 300;

export interface UndoRegisterInput {
  actorId: string;
  actionType: string;
  entityId: string;
  inversePayload: unknown;
  ttlSeconds?: number;
}

export interface UndoConsumeResult {
  undoActionId: string;
  actionType: string;
  entityId: string;
  consumedAt: Date;
}

interface DbRow {
  id: string;
  actorId: string;
  actionType: string;
  entityId: string;
  inversePayload: unknown;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

// HD-8 / Chunk 8.2 — server-side undo for reversible destructive
// actions. Two methods:
//
//   register(...) → stash a row in `undo_actions` capturing the inverse
//     payload. Returns `undoActionId` which the controller layer hands
//     back to the FE so the user can hit it via toast → consume.
//
//   consume(id, actorId) → idempotent state machine:
//      - 404 if the row doesn't exist
//      - 403 if the actor doesn't match (different user trying to undo)
//      - 410 if the row has expired
//      - already-consumed: re-returns the same result (idempotent so
//        a double-clicked undo button can't half-execute)
//      - fresh: resolve an executor for `actionType`, run it, stamp
//        `consumedAt`. Returns the consumed result.
//
// The executor registry lives in `UndoActionExecutorRegistry` and is
// populated by domain modules at boot (mirrors the OutboxEventHandler
// pattern from HD-0.3).
@Injectable()
export class UndoService {
  private readonly logger = new Logger(UndoService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly registry: UndoActionExecutorRegistry,
  ) {}

  public async register(input: UndoRegisterInput): Promise<string> {
    const ttlSeconds = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const row = await this.prisma.undoAction.create({
      data: {
        actorId: input.actorId,
        actionType: input.actionType,
        entityId: input.entityId,
        inversePayload: (input.inversePayload ?? null) as Prisma.InputJsonValue,
        expiresAt,
      },
      select: { id: true },
    });
    return row.id;
  }

  public async consume(
    undoActionId: string,
    actorId: string,
  ): Promise<UndoConsumeResult> {
    const row = (await this.prisma.undoAction.findUnique({
      where: { id: undoActionId },
    })) as unknown as DbRow | null;
    if (!row) throw new NotFoundException(`Undo action ${undoActionId} not found.`);
    if (row.actorId !== actorId) {
      throw new ForbiddenException(
        `Undo action ${undoActionId} belongs to a different actor.`,
      );
    }
    if (row.consumedAt) {
      // Idempotent — same result for a double-click.
      return {
        undoActionId: row.id,
        actionType: row.actionType,
        entityId: row.entityId,
        consumedAt: row.consumedAt,
      };
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new GoneException(
        `Undo action ${undoActionId} has expired (TTL was ${row.expiresAt.toISOString()}).`,
      );
    }

    const executor = this.registry.resolve(row.actionType);
    if (!executor) {
      // No executor registered — surface as 503 instead of letting the
      // row consume silently. Keeps the row replayable when the
      // executor lands.
      throw new ServiceUnavailableException(
        `No undo executor registered for actionType=${row.actionType}.`,
      );
    }

    const dispatchRow: UndoActionRow = {
      id: row.id,
      actorId: row.actorId,
      actionType: row.actionType,
      entityId: row.entityId,
      inversePayload: row.inversePayload,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    };

    await executor.execute(dispatchRow);

    const consumedAt = new Date();
    await this.prisma.undoAction.update({
      where: { id: row.id },
      data: { consumedAt },
    });

    return {
      undoActionId: row.id,
      actionType: row.actionType,
      entityId: row.entityId,
      consumedAt,
    };
  }
}
