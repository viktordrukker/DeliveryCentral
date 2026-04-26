import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * DM-7-2 — DomainEvent gateway. Write an append-only event into the
 * transactional outbox (DomainEvent table, DM-7-1) using the caller's
 * Prisma $transaction client so the event and the aggregate mutation
 * commit or rollback as one unit.
 *
 * Usage (from a service that owns an aggregate):
 *
 *   await this.prisma.$transaction(async (tx) => {
 *     const updated = await tx.project.update({
 *       where: { id },
 *       data: { ... },
 *     });
 *     await this.domainEvents.record(tx, {
 *       aggregateType: 'Project',
 *       aggregateId: updated.id,
 *       eventName: 'ProjectBudgetAmended',
 *       actorId: ctx.personId,
 *       payload: { before, after },
 *     });
 *     return updated;
 *   });
 *
 * The record() method uses `$executeRawUnsafe` against the tx
 * client — Prisma Client has no generated model for DomainEvent
 * (declarative partitioning + composite PK collides with prisma
 * migrate). Arguments are parameterized; the raw call is safe.
 *
 * Do NOT call record() outside a $transaction — the point of this
 * module is atomicity with the aggregate write.
 */

export interface DomainEventInput {
  aggregateType: string;
  aggregateId: string;
  eventName: string;
  actorId?: string | null;
  correlationId?: string | null;
  causationId?: string | null;
  payload: Record<string, unknown>;
}

type TxClient = Prisma.TransactionClient;

@Injectable()
export class DomainEventService {
  private readonly logger = new Logger(DomainEventService.name);

  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Append a DomainEvent row inside a Prisma $transaction. The event is
   * part of the same atomic unit as the aggregate write that precedes
   * the call — if either fails, both roll back.
   */
  public async record(tx: TxClient, event: DomainEventInput): Promise<void> {
    await tx.$executeRawUnsafe(
      `INSERT INTO "DomainEvent"
         ("aggregateType", "aggregateId", "eventName", "actorId",
          "correlationId", "causationId", payload)
       VALUES ($1, $2::uuid, $3, $4::uuid, $5, $6::uuid, $7::jsonb)`,
      event.aggregateType,
      event.aggregateId,
      event.eventName,
      event.actorId ?? null,
      event.correlationId ?? null,
      event.causationId ?? null,
      JSON.stringify(event.payload),
    );
  }

  /**
   * Convenience wrapper for callers that do not already have a
   * $transaction context and want an atomic single-event write. Prefer
   * `record()` inside an existing transaction whenever an aggregate
   * mutation is also happening.
   */
  public async recordAtomic(event: DomainEventInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.record(tx, event);
    });
  }
}
