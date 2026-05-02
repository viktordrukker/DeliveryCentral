import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SetupRunLogLevel } from '@prisma/client';

import { redactSecrets } from '../domain/redact';
import type { SetupStepKey } from '../domain/step-keys';
import type { SetupRunsRepositoryPort } from '../domain/setup-runs.repository.port';

import { SETUP_RUNS_REPOSITORY } from './tokens';

interface SetupLogInput {
  runId: string;
  stepKey: SetupStepKey;
  level?: SetupRunLogLevel;
  event: string;
  payload?: unknown;
  durationMs?: number;
}

/**
 * Verbose breadcrumb logger for the setup wizard. Every call writes the
 * structured line to BOTH:
 *
 *   1. The standard NestJS Logger (pino-backed) — so `docker logs <c>`
 *      catches it for ops + so it lands in any external log forwarder
 *      the operator wires up later.
 *   2. `setup_run_logs` — so the diagnostic-bundle download has the full
 *      install history even after container rotation.
 *
 * Secrets are auto-redacted before either sink sees them.
 *
 * Failure of the DB sink (e.g. during the EMPTY_POSTGRES branch where
 * the DB doesn't exist yet) is swallowed — the pino sink is the
 * authoritative write at install time.
 */
@Injectable()
export class SetupLoggerService {
  private readonly logger = new Logger('setup-wizard');

  public constructor(
    @Inject(SETUP_RUNS_REPOSITORY)
    private readonly repo: SetupRunsRepositoryPort,
  ) {}

  public async log(input: SetupLogInput): Promise<void> {
    const level: SetupRunLogLevel = input.level ?? 'INFO';
    const payload = input.payload === undefined ? undefined : redactSecrets(input.payload);

    // 1. stdout via NestJS Logger
    const line = JSON.stringify({
      run_id: input.runId,
      step_key: input.stepKey,
      level,
      event: input.event,
      payload,
      duration_ms: input.durationMs,
    });
    switch (level) {
      case 'ERROR':
        this.logger.error(line);
        break;
      case 'WARN':
        this.logger.warn(line);
        break;
      case 'DEBUG':
      case 'TRACE':
        this.logger.debug(line);
        break;
      default:
        this.logger.log(line);
    }

    // 2. setup_run_logs — best-effort
    try {
      await this.repo.appendLog({
        runId: input.runId,
        stepKey: input.stepKey,
        level,
        event: input.event,
        payloadRedacted: (payload as Record<string, unknown> | undefined) ?? null,
        durationMs: input.durationMs ?? null,
      });
    } catch (err) {
      // Swallow — the wizard's first step (EMPTY_POSTGRES) intentionally
      // runs before the setup_run_logs table is reachable on the target
      // DB. Pino sink is the source of truth for that window.
      this.logger.warn(
        `setup_run_logs append failed (run=${input.runId} step=${input.stepKey}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /** Convenience helper that times an awaitable + emits an INFO line on success / ERROR on throw. */
  public async wrap<T>(
    runId: string,
    stepKey: SetupStepKey,
    event: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = Date.now();
    try {
      const value = await fn();
      await this.log({
        runId,
        stepKey,
        level: 'INFO',
        event,
        durationMs: Date.now() - start,
      });
      return value;
    } catch (err) {
      await this.log({
        runId,
        stepKey,
        level: 'ERROR',
        event: `${event}.failed`,
        payload: { message: err instanceof Error ? err.message : String(err) },
        durationMs: Date.now() - start,
      });
      throw err;
    }
  }
}
