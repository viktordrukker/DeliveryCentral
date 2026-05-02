// The 8 wizard steps in execution order. Stored in `setup_runs.step_key`
// and used by the frontend stepper to render the correct screen.
//
// `migrations` is conditional — only inserted into the run when preflight
// surfaces pending migrations (see SetupService.startRun).

export const SETUP_STEP_KEYS = [
  'preflight',
  'migrations',
  'tenant',
  'admin',
  'integrations',
  'monitoring',
  'seed',
  'complete',
] as const;

export type SetupStepKey = (typeof SETUP_STEP_KEYS)[number];

export const SEED_PROFILES = ['demo', 'preset', 'clean'] as const;
export type SeedProfile = (typeof SEED_PROFILES)[number];

// pg_advisory_xact_lock identifier — picked to be visually identifiable in
// Postgres locking views (`pg_locks`). Keep stable across releases.
export const SETUP_ADVISORY_LOCK_ID = 0xdc5e7000 as const;
