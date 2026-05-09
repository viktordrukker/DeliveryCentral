import { Injectable } from '@nestjs/common';

/**
 * Shape of a single OutboxEvent the publisher dispatches to a handler.
 * Mirrors a subset of the Prisma model — payload is opaque, parsing is the
 * handler's responsibility.
 */
export interface DispatchableOutboxEvent {
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
 * A handler returns void on success, or throws to signal failure. The thrown
 * Error's `message` is persisted in `OutboxEvent.lastError` for triage. The
 * publisher does not interpret the error class — every throw counts as a
 * single failed attempt.
 */
export type OutboxEventHandler = (event: DispatchableOutboxEvent) => Promise<void>;

interface HandlerKey {
  topic: string;
  eventName: string;
}

function keyToString(key: HandlerKey): string {
  return `${key.topic}::${key.eventName}`;
}

/**
 * In-process registry of OutboxEvent handlers. Modules call `register(...)`
 * during their `onModuleInit` to wire up the handlers they own; the
 * publisher looks up the handler for each row by `(topic, eventName)`.
 *
 * Multiple handlers per `(topic, eventName)` are not supported in this
 * iteration — fan-out lives in the handler itself if needed (e.g., the
 * notification translator handler can dispatch to email + in-app inbox
 * inside one call).
 *
 * The registry is intentionally simple: no priority, no middleware, no
 * per-event observability. The `OutboxEventPublisherService` already
 * surfaces metrics and a structured warn line for unhandled events.
 */
@Injectable()
export class OutboxEventHandlerRegistry {
  private readonly handlers = new Map<string, OutboxEventHandler>();

  public register(key: HandlerKey, handler: OutboxEventHandler): void {
    const k = keyToString(key);
    if (this.handlers.has(k)) {
      throw new Error(
        `OutboxEventHandlerRegistry: duplicate handler for ${k}. Each (topic, eventName) supports a single handler.`,
      );
    }
    this.handlers.set(k, handler);
  }

  public resolve(key: HandlerKey): OutboxEventHandler | undefined {
    return this.handlers.get(keyToString(key));
  }

  public size(): number {
    return this.handlers.size;
  }
}
