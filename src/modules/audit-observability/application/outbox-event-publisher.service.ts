import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { PlatformFlagsService } from '@src/shared/config/platform-flags.service';
import { MetricsService } from '@src/shared/observability/metrics.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  DispatchableOutboxEvent,
  OutboxEventHandlerRegistry,
} from './outbox-event-handler-registry';

const KEY_INTERVAL = 'outbox.publisher.intervalSeconds';
const KEY_BATCH = 'outbox.publisher.batchSize';
const KEY_MAX_ATTEMPTS = 'outbox.maxAttempts';

const DEFAULT_INTERVAL_SECONDS = 5;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_ATTEMPTS = 5;

const BACKOFF_BASE_MS = 5_000;
const BACKOFF_CAP_MS = 5 * 60_000; // 5 minutes

interface OutboxRow {
  id: string;
  topic: string;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string | null;
  payload: unknown;
  attempts: number;
  createdAt: Date;
}

/**
 * Polls the `OutboxEvent` table on a configurable interval and dispatches
 * each PENDING / RETRY row whose `availableAt` has elapsed to a handler
 * registered against `(topic, eventName)`.
 *
 * Why an outbox + publisher: today the
 * `NotificationEventTranslatorService` runs synchronously inside the
 * caller's request thread. A failure in email delivery silently swallows
 * via `dispatchQuietly()`. Moving fan-out to a transactionally-written
 * outbox + an at-least-once publisher gives us:
 *
 *   1. **Atomicity** — the event is committed in the same `$transaction`
 *      as the aggregate write (HD-0.2 wired the tx-aware repos), so a
 *      handler crash can't disagree with what got persisted.
 *   2. **Retries with bounded attempts** — a 5xx Mailgun blip no longer
 *      drops a notification on the floor.
 *   3. **Observability** — stuck rows have `lastError`, `attempts`, and
 *      `availableAt` available to ops without grepping logs.
 *
 * This service is gated by `flag.outboxEnabled` (default `false`) so the
 * existing synchronous translator stays the single source of truth until
 * consumers are wired. Enable per-tenant once handlers are registered.
 *
 * Concurrency model: this iteration assumes a single backend instance.
 * When we scale out, claim rows with `UPDATE … RETURNING` instead of
 * `SELECT`-then-`UPDATE` so racing publishers can't double-dispatch.
 */
@Injectable()
export class OutboxEventPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxEventPublisherService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private warnedNoHandler = new Set<string>();

  public constructor(
    private readonly prisma: PrismaService,
    private readonly registry: OutboxEventHandlerRegistry,
    private readonly platformFlags?: PlatformFlagsService,
    private readonly metrics?: MetricsService,
  ) {}

  public async onModuleInit(): Promise<void> {
    const enabled = this.platformFlags
      ? await this.platformFlags.isEnabled('outboxEnabled')
      : false;
    if (!enabled) {
      this.logger.log('OutboxEventPublisher disabled (flag.outboxEnabled=false).');
      return;
    }
    const intervalMs = (await this.numberSetting(KEY_INTERVAL, DEFAULT_INTERVAL_SECONDS)) * 1000;
    this.timer = setInterval(() => {
      void this.tickSafe();
    }, intervalMs);
    this.logger.log(
      `OutboxEventPublisher scheduled every ${intervalMs / 1000}s; ${this.registry.size()} handler(s) registered.`,
    );
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Public entry point — claim a batch and dispatch each row. Returns a
   * compact summary so unit tests can assert on what happened.
   */
  public async tick(now: Date = new Date()): Promise<{
    dispatched: number;
    succeeded: number;
    failed: number;
    skipped: number;
  }> {
    const batchSize = await this.numberSetting(KEY_BATCH, DEFAULT_BATCH_SIZE);
    const maxAttempts = await this.numberSetting(KEY_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS);

    const rows = await this.claimBatch(now, batchSize);
    if (rows.length === 0) {
      return { dispatched: 0, succeeded: 0, failed: 0, skipped: 0 };
    }

    this.metrics?.incOutboxClaimed(rows.length);

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of rows) {
      const handler = this.registry.resolve({ topic: row.topic, eventName: row.eventName });
      if (!handler) {
        this.warnNoHandler(row.topic, row.eventName);
        skipped += 1;
        continue;
      }

      const event: DispatchableOutboxEvent = {
        id: row.id,
        topic: row.topic,
        eventName: row.eventName,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        correlationId: row.correlationId,
        payload: row.payload,
        attempts: row.attempts,
        createdAt: row.createdAt,
      };

      try {
        await handler(event);
        await this.markPublished(row.id, now);
        this.metrics?.incOutboxDispatched(row.eventName);
        succeeded += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown handler error';
        const nextAttempts = row.attempts + 1;
        if (nextAttempts >= maxAttempts) {
          await this.markFailed(row.id, nextAttempts, message);
          this.metrics?.incOutboxFailed(row.eventName);
          this.logger.warn(
            JSON.stringify({
              event: 'outbox_event_failed',
              outboxId: row.id,
              topic: row.topic,
              eventName: row.eventName,
              attempts: nextAttempts,
              error: message,
            }),
          );
        } else {
          const delay = this.backoffMs(nextAttempts);
          await this.markRetry(row.id, nextAttempts, message, new Date(now.getTime() + delay));
          this.metrics?.incOutboxRetried(row.eventName);
        }
        failed += 1;
      }
    }

    return { dispatched: rows.length, succeeded, failed, skipped };
  }

  private async tickSafe(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.tick();
      if (result.dispatched > 0) {
        this.logger.debug(
          `Outbox tick: dispatched=${result.dispatched} succeeded=${result.succeeded} failed=${result.failed} skipped=${result.skipped}`,
        );
      }
      // HD-11 — refresh backlog gauge after each tick. Cheap COUNT(*).
      try {
        const backlog = await this.prisma.outboxEvent.count({
          where: { status: { in: ['PENDING', 'RETRY'] } },
        });
        this.metrics?.setOutboxBacklog(backlog);
      } catch {
        // gauge update never blocks the tick.
      }
    } catch (err) {
      this.logger.warn(
        `Outbox tick failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async claimBatch(now: Date, batchSize: number): Promise<OutboxRow[]> {
    const client = this.prisma as unknown as {
      outboxEvent: {
        findMany(args: unknown): Promise<OutboxRow[]>;
      };
    };
    return client.outboxEvent.findMany({
      where: {
        status: { in: ['PENDING', 'RETRY'] },
        availableAt: { lte: now },
      },
      orderBy: [{ createdAt: 'asc' }],
      take: batchSize,
      select: {
        id: true,
        topic: true,
        eventName: true,
        aggregateType: true,
        aggregateId: true,
        correlationId: true,
        payload: true,
        attempts: true,
        createdAt: true,
      },
    });
  }

  private async markPublished(id: string, now: Date): Promise<void> {
    const client = this.prisma as unknown as {
      outboxEvent: { update(args: unknown): Promise<unknown> };
    };
    await client.outboxEvent.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: now, lastError: null },
    });
  }

  private async markRetry(
    id: string,
    attempts: number,
    error: string,
    availableAt: Date,
  ): Promise<void> {
    const client = this.prisma as unknown as {
      outboxEvent: { update(args: unknown): Promise<unknown> };
    };
    await client.outboxEvent.update({
      where: { id },
      data: { status: 'RETRY', attempts, lastError: error, availableAt },
    });
  }

  private async markFailed(id: string, attempts: number, error: string): Promise<void> {
    const client = this.prisma as unknown as {
      outboxEvent: { update(args: unknown): Promise<unknown> };
    };
    await client.outboxEvent.update({
      where: { id },
      data: { status: 'FAILED', attempts, lastError: error },
    });
  }

  private backoffMs(attempts: number): number {
    const exp = Math.min(BACKOFF_BASE_MS * 2 ** (attempts - 1), BACKOFF_CAP_MS);
    // ±20% jitter to prevent thundering-herd on a downstream that has just recovered.
    const jitter = (Math.random() - 0.5) * 0.4 * exp;
    return Math.max(BACKOFF_BASE_MS, Math.floor(exp + jitter));
  }

  private warnNoHandler(topic: string, eventName: string): void {
    const key = `${topic}::${eventName}`;
    if (this.warnedNoHandler.has(key)) return;
    this.warnedNoHandler.add(key);
    this.logger.warn(
      `OutboxEventPublisher: no handler registered for (topic=${topic}, eventName=${eventName}). Rows stay PENDING; warning suppressed for the rest of this process lifetime.`,
    );
  }

  private async numberSetting(key: string, fallback: number): Promise<number> {
    try {
      const row = await this.prisma.platformSetting.findUnique({ where: { key } });
      const value = row?.value;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const n = Number(value);
        if (!Number.isNaN(n)) return n;
      }
    } catch {
      // PlatformSetting unavailable — the publisher tolerates missing config and uses the fallback.
    }
    return fallback;
  }

}
