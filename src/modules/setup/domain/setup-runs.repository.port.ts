import type { SetupRun, SetupRunLog, SetupRunStatus, SetupRunLogLevel } from '@prisma/client';

import type { SetupStepKey } from './step-keys';

export interface UpsertStepInput {
  runId: string;
  stepKey: SetupStepKey;
  status: SetupRunStatus;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  errorPayload?: Record<string, unknown> | null;
  actorId?: string | null;
  payloadRedacted?: Record<string, unknown> | null;
}

export interface AppendLogInput {
  runId: string;
  stepKey: SetupStepKey;
  level: SetupRunLogLevel;
  event: string;
  payloadRedacted?: Record<string, unknown> | null;
  durationMs?: number | null;
}

export interface SetupRunsRepositoryPort {
  /** Find the active run (latest non-COMPLETED) — or null if there is none. */
  findActiveRun(): Promise<{ runId: string; latestStep: SetupStepKey | null } | null>;

  /** Find the run that last reached `complete` step (or null if never). */
  findLastCompletedRun(): Promise<{ runId: string; completedAt: Date } | null>;

  /** Get every step row for a run, oldest-first. */
  listSteps(runId: string): Promise<SetupRun[]>;

  /** Find a single step row, or null if never started. */
  findStep(runId: string, stepKey: SetupStepKey): Promise<SetupRun | null>;

  /** Idempotent upsert. */
  upsertStep(input: UpsertStepInput): Promise<SetupRun>;

  /** Verbose breadcrumb. Auto-numbers `sequence`. */
  appendLog(input: AppendLogInput): Promise<SetupRunLog>;

  /** Diagnostic-bundle source: every log row for a run, oldest-first. */
  listLogs(runId: string): Promise<SetupRunLog[]>;

  /** Reset path — wipes BOTH tables for the given run id (or all rows when omitted). */
  truncateRun(runId?: string): Promise<void>;

  /** Truncate every setup_run / setup_run_log row regardless of status. Used by Reset + CLEAN_INSTALL. */
  truncateAll(): Promise<void>;
}
