import { Injectable, Logger } from '@nestjs/common';

// HD-8 / Chunk 8.2 — UndoService stamps a row + then dispatches to a
// per-`actionType` executor that knows how to actually reverse the
// state change. Mirrors the OutboxEventHandlerRegistry pattern from
// HD-0.3 — the registry is dumb data; modules that own a domain
// register the inverse logic at boot.

export interface UndoActionRow {
  id: string;
  actorId: string;
  actionType: string;
  entityId: string;
  inversePayload: unknown;
  createdAt: Date;
  expiresAt: Date;
}

export interface UndoActionExecutor {
  // Stable, dot-separated, lowercase. e.g. `assignment.cancel`.
  readonly actionType: string;
  // Apply the inverse mutation. Throw on failure — the caller surfaces
  // it to the FE as a 5xx; the row stays unconsumed so the caller can
  // retry. Idempotency lives here when domain semantics demand it.
  execute(row: UndoActionRow): Promise<void>;
}

@Injectable()
export class UndoActionExecutorRegistry {
  private readonly logger = new Logger(UndoActionExecutorRegistry.name);
  private readonly executors = new Map<string, UndoActionExecutor>();

  public register(executor: UndoActionExecutor): void {
    if (this.executors.has(executor.actionType)) {
      this.logger.warn(
        `UndoActionExecutor for actionType=${executor.actionType} replaced — duplicate registration.`,
      );
    }
    this.executors.set(executor.actionType, executor);
  }

  public resolve(actionType: string): UndoActionExecutor | undefined {
    return this.executors.get(actionType);
  }

  public size(): number {
    return this.executors.size;
  }
}
