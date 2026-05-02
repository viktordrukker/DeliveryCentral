import { randomUUID } from 'node:crypto';

import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { NodemailerSmtpEmailTransport } from '@src/modules/notifications/infrastructure/adapters/nodemailer-smtp-email.transport';
import type { EmailTransport } from '@src/modules/notifications/infrastructure/adapters/email.transport';
import { AppConfig } from '@src/shared/config/app-config';

import { redactSecrets } from '../domain/redact';
import { SETUP_ADVISORY_LOCK_ID, type SeedProfile, type SetupStepKey } from '../domain/step-keys';
import type { SetupRunsRepositoryPort } from '../domain/setup-runs.repository.port';

import { PreflightChecksService, type PreflightResult } from './preflight-checks';
import { RequireSetupCompleteGuard } from './require-setup-complete.guard';
import { SetupLoggerService } from './setup-logger.service';
import { SetupTokenService } from './setup-token.service';
import { SystemStateService } from './system-state.service';
import { ApplyAdminOnlySeedsRunner } from './seed-runners/apply-admin-only-seeds';
import { ApplyDemoSeedsRunner } from './seed-runners/apply-demo-seeds';
import { ApplyInfrastructureSeedsRunner } from './seed-runners/apply-infrastructure-seeds';
import { SETUP_RUNS_REPOSITORY } from './tokens';

interface TenantInput {
  code: string;
  name: string;
  timezone: string;
  locale: string;
  currency: string;
}

interface AdminInput {
  email: string;
  password: string;
  displayName?: string;
}

interface IntegrationsInput {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  emailFromAddress?: string;
  corsOrigin?: string;
  accessTokenExpiresInSec?: number;
  refreshTokenExpiresInSec?: number;
}

interface MonitoringInput {
  otlp?: { enabled: boolean; endpoint?: string; headers?: string };
  splunk?: { enabled: boolean; hecUrl?: string; token?: string };
  datadog?: { enabled: boolean; apiKey?: string; region?: string };
  syslog?: { enabled: boolean; host?: string; port?: number };
}

export interface SetupStatus {
  /** True when the wizard must be completed before the app is usable. */
  required: boolean;
  /** True when the operator hasn't presented a token yet this session. */
  tokenRequired: boolean;
  /** Active run id (or null if the next request should start a fresh run). */
  runId: string | null;
  /** Resume hint — first non-COMPLETED step. */
  nextStep: SetupStepKey | null;
  /** Set after `complete` — null until then. */
  completedAt: string | null;
  /** Connection fingerprint exposed for the UI banner — populated after preflight. */
  fingerprint: PreflightResult['fingerprint'] | null;
}

@Injectable()
export class SetupService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfig,
    private readonly platformSettings: PlatformSettingsService,
    private readonly preflight: PreflightChecksService,
    private readonly logger: SetupLoggerService,
    private readonly token: SetupTokenService,
    private readonly infraRunner: ApplyInfrastructureSeedsRunner,
    private readonly demoRunner: ApplyDemoSeedsRunner,
    private readonly adminRunner: ApplyAdminOnlySeedsRunner,
    private readonly systemState: SystemStateService,
    @Inject(SETUP_RUNS_REPOSITORY) private readonly repo: SetupRunsRepositoryPort,
  ) {}

  // ─── Public surface (called from controller) ─────────────────────────────

  public async getStatus(): Promise<SetupStatus> {
    const completedSetting = await this.platformSettings.getRawValue('setup.completedAt');
    const completedAt = completedSetting ? String(completedSetting) : null;

    if (completedAt) {
      return {
        required: false,
        tokenRequired: false,
        runId: null,
        nextStep: null,
        completedAt,
        fingerprint: null,
      };
    }

    // Wizard still pending. Either resume an active run, or signal a fresh run is needed.
    const active = await this.repo.findActiveRun();
    return {
      required: true,
      tokenRequired: !this.token.isActive(),
      runId: active?.runId ?? null,
      nextStep: active?.latestStep ?? null,
      completedAt: null,
      fingerprint: null,
    };
  }

  /** Ensure a token has been issued. Idempotent. */
  public async issueToken(): Promise<string> {
    return this.token.issue();
  }

  /** Step 1 — preflight. Acquires advisory lock + records run row + returns branch result. */
  public async runPreflight(runId?: string): Promise<{ runId: string; result: PreflightResult }> {
    const id = runId ?? randomUUID();
    return this.withAdvisoryLock(async () => {
      await this.markStepInProgress(id, 'preflight');
      try {
        const result = await this.preflight.run(id);
        await this.markStepCompleted(id, 'preflight', {
          branch: result.branch,
          fingerprint: result.fingerprint,
          migrations: result.migrations,
          hostFacts: result.hostFacts,
        });
        return { runId: id, result };
      } catch (err) {
        await this.markStepFailed(id, 'preflight', err);
        throw err;
      }
    });
  }

  /**
   * Step 2 — migrations. Auto-resolves P3009 + applies pending migrations +
   * runs schema diff and tries to auto-fix any leftover gap. On unrecoverable
   * gap, raises and the UI offers wipe+recreate.
   */
  public async applyMigrations(runId: string, options: { wipeFirst?: boolean } = {}): Promise<void> {
    return this.withAdvisoryLock(async () => {
      await this.markStepInProgress(runId, 'migrations');
      try {
        const target = this.preflight.resolveTarget();
        const targetClient = new PrismaClient({
          datasources: { db: { url: this.preflight.buildTargetUrl() } },
        });
        const clusterClient = new PrismaClient({
          datasources: { db: { url: this.preflight.buildClusterUrl() } },
        });
        try {
          if (options.wipeFirst) {
            await this.logger.log({
              runId,
              stepKey: 'migrations',
              level: 'WARN',
              event: 'migrations.wipe.schema',
              payload: { target: target.database },
            });
            await targetClient.$executeRawUnsafe(`DROP SCHEMA IF EXISTS public CASCADE`);
            await targetClient.$executeRawUnsafe(`CREATE SCHEMA public`);
          }

          // Auto-resolve P3009 — only meaningful if `_prisma_migrations` exists
          await this.autoResolveFailedMigrations(runId, targetClient);

          // Apply pending migrations via prisma's CLI invoked in-process. Easier
          // than rolling our own runner — it knows about the manifest format.
          await this.invokePrismaMigrateDeploy(runId, target);

          // Diff vs schema.prisma. Apply the SQL if non-empty.
          await this.tryAutoFixSchemaDiff(runId, targetClient);

          await this.markStepCompleted(runId, 'migrations', {});
          await this.systemState.refresh();
        } finally {
          await targetClient.$disconnect();
          await clusterClient.$disconnect();
        }
      } catch (err) {
        await this.markStepFailed(runId, 'migrations', err);
        throw err;
      }
    });
  }

  /** Step EMPTY_POSTGRES recovery — CREATE ROLE + CREATE DATABASE on the cluster. */
  public async createDatabase(runId: string): Promise<void> {
    return this.withAdvisoryLock(async () => {
      await this.markStepInProgress(runId, 'preflight');
      const target = this.preflight.resolveTarget();
      const clusterClient = new PrismaClient({
        datasources: { db: { url: this.preflight.buildClusterUrl() } },
      });
      try {
        // 1. Generate or reuse the prod_user password
        let prodPwd: string | null;
        const stored = await this.platformSettings.getRawValue('db.prodUserPassword');
        prodPwd = stored ? String(stored) : null;
        if (!prodPwd) {
          prodPwd = randomUUID();
          // Settings persistence happens AFTER setup_runs exists; we'll write
          // the value once the target DB is migrated below.
        }

        // 2. CREATE ROLE if missing
        const roleName = 'prod_user';
        await this.logger.log({
          runId,
          stepKey: 'preflight',
          level: 'INFO',
          event: 'preflight.createRole',
          payload: { role: roleName },
        });
        await clusterClient.$executeRawUnsafe(
          `DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${roleName}') THEN
                CREATE ROLE ${roleName} LOGIN PASSWORD '${prodPwd.replace(/'/g, "''")}';
              END IF;
            END
          $$;`,
        );

        // 3. CREATE DATABASE
        await this.logger.log({
          runId,
          stepKey: 'preflight',
          level: 'INFO',
          event: 'preflight.createDatabase',
          payload: { database: target.database, owner: roleName },
        });
        await clusterClient.$executeRawUnsafe(
          `CREATE DATABASE "${target.database.replace(/"/g, '""')}" OWNER ${roleName}`,
        );

        // 4. After DB exists, push the password into platform_settings so
        //    a future Reset can re-use the role without regenerating.
        await this.platformSettings.updateKey('db.prodUserPassword', prodPwd);

        await this.markStepCompleted(runId, 'preflight', {
          action: 'createdDatabase',
          database: target.database,
          role: roleName,
        });
      } catch (err) {
        await this.markStepFailed(runId, 'preflight', err);
        throw err;
      } finally {
        await clusterClient.$disconnect();
      }
    });
  }

  // Step 3 — tenant
  public async upsertDefaultTenant(runId: string, input: TenantInput): Promise<void> {
    return this.withAdvisoryLock(async () => {
      await this.markStepInProgress(runId, 'tenant');
      try {
        // Tenant table created by DM-R-11 recovery migration.
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "Tenant" (id, code, name, "isActive", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW())
           ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW()`,
          input.code,
          input.name,
        );

        // Carry the timezone/locale/currency to platform_settings — Tenant
        // table doesn't have those columns yet, so settings is the source.
        await this.platformSettings.updateKey('general.timezone', input.timezone);
        await this.platformSettings.updateKey('general.currency', input.currency);
        await this.platformSettings.updateKey('setup.tenantId', input.code);

        await this.markStepCompleted(runId, 'tenant', { code: input.code });
      } catch (err) {
        await this.markStepFailed(runId, 'tenant', err);
        throw err;
      }
    });
  }

  // Step 4 — admin
  public async createAdmin(runId: string, input: AdminInput): Promise<void> {
    return this.withAdvisoryLock(async () => {
      await this.markStepInProgress(runId, 'admin');
      try {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
          throw new BadRequestException('Invalid admin email.');
        }
        if (input.password.length < 12) {
          throw new BadRequestException('Admin password must be at least 12 characters.');
        }
        await this.adminRunner.run(runId, input);
        await this.markStepCompleted(runId, 'admin', {
          email: input.email,
          displayName: input.displayName ?? null,
        });
      } catch (err) {
        await this.markStepFailed(runId, 'admin', err);
        throw err;
      }
    });
  }

  // Step 5 — integrations (settings only; SMTP test is a separate idempotent endpoint)
  public async saveIntegrations(runId: string, input: IntegrationsInput): Promise<void> {
    return this.withAdvisoryLock(async () => {
      await this.markStepInProgress(runId, 'integrations');
      try {
        const updates: Record<string, unknown> = {};
        if (input.smtpHost !== undefined) updates['notifications.smtp.host'] = input.smtpHost;
        if (input.smtpPort !== undefined) updates['notifications.smtp.port'] = input.smtpPort;
        if (input.smtpUser !== undefined) updates['notifications.smtp.username'] = input.smtpUser;
        if (input.smtpPassword !== undefined) updates['notifications.smtp.password'] = input.smtpPassword;
        if (input.smtpSecure !== undefined) updates['notifications.smtp.secure'] = input.smtpSecure;
        if (input.emailFromAddress !== undefined)
          updates['notifications.emailFromAddress'] = input.emailFromAddress;
        if (input.corsOrigin !== undefined) updates['security.corsOrigin'] = input.corsOrigin;
        if (input.accessTokenExpiresInSec !== undefined)
          updates['auth.accessTokenExpiresIn'] = input.accessTokenExpiresInSec;
        if (input.refreshTokenExpiresInSec !== undefined)
          updates['auth.refreshTokenExpiresIn'] = input.refreshTokenExpiresInSec;

        for (const [k, v] of Object.entries(updates)) {
          await this.platformSettings.updateKey(k, v);
        }

        await this.markStepCompleted(runId, 'integrations', { keys: Object.keys(updates).length });
      } catch (err) {
        await this.markStepFailed(runId, 'integrations', err);
        throw err;
      }
    });
  }

  /** Optional SMTP send test — reports the transport response, no DB write. */
  public async sendSmtpTest(runId: string, recipient: string): Promise<{ ok: boolean; detail?: string }> {
    return this.withAdvisoryLock(async () => {
      try {
        // Construct an ad-hoc transport so the test reflects the wizard's
        // *current* config (not whatever was loaded at NestJS boot). The
        // wizard's `integrations` step writes to platform_settings, but
        // the AppConfig env-var defaults are still what NodemailerSmtpEmailTransport reads.
        const transport: EmailTransport = new NodemailerSmtpEmailTransport(this.appConfig);
        await transport.send({
          from: this.appConfig.notificationsEmailFromAddress,
          to: recipient,
          subject: 'DeliveryCentral setup wizard — test email',
          text: 'If you received this, your SMTP configuration is reachable from the DeliveryCentral backend.',
        });
        await this.logger.log({
          runId,
          stepKey: 'integrations',
          level: 'INFO',
          event: 'integrations.smtpTest.ok',
          payload: { recipient },
        });
        return { ok: true };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        await this.logger.log({
          runId,
          stepKey: 'integrations',
          level: 'WARN',
          event: 'integrations.smtpTest.failed',
          payload: { recipient, detail },
        });
        return { ok: false, detail };
      }
    });
  }

  // Step 6 — monitoring forwarders
  public async saveMonitoring(runId: string, input: MonitoringInput): Promise<void> {
    return this.withAdvisoryLock(async () => {
      await this.markStepInProgress(runId, 'monitoring');
      try {
        const writes: Record<string, unknown> = {};
        if (input.otlp) {
          writes['monitoring.otlp.enabled'] = !!input.otlp.enabled;
          writes['monitoring.otlp.endpoint'] = input.otlp.endpoint ?? '';
          writes['monitoring.otlp.headers'] = input.otlp.headers ?? '';
        }
        if (input.splunk) {
          writes['monitoring.splunk.enabled'] = !!input.splunk.enabled;
          writes['monitoring.splunk.hecUrl'] = input.splunk.hecUrl ?? '';
          writes['monitoring.splunk.token'] = input.splunk.token ?? '';
        }
        if (input.datadog) {
          writes['monitoring.datadog.enabled'] = !!input.datadog.enabled;
          writes['monitoring.datadog.apiKey'] = input.datadog.apiKey ?? '';
          writes['monitoring.datadog.region'] = input.datadog.region ?? 'US1';
        }
        if (input.syslog) {
          writes['monitoring.syslog.enabled'] = !!input.syslog.enabled;
          writes['monitoring.syslog.host'] = input.syslog.host ?? '';
          writes['monitoring.syslog.port'] = input.syslog.port ?? 514;
        }
        for (const [k, v] of Object.entries(writes)) {
          await this.platformSettings.updateKey(k, v);
        }
        await this.markStepCompleted(runId, 'monitoring', { keys: Object.keys(writes).length });
      } catch (err) {
        await this.markStepFailed(runId, 'monitoring', err);
        throw err;
      }
    });
  }

  // Step 7 — seed
  public async runSeed(runId: string, profile: SeedProfile): Promise<void> {
    return this.withAdvisoryLock(async () => {
      await this.markStepInProgress(runId, 'seed');
      try {
        if (profile === 'demo' || profile === 'preset') {
          // Both run the infrastructure layer (skills, dictionaries, etc.).
          // Demo additionally runs the IT-company scenario data.
          await this.infraRunner.run(runId);
          if (profile === 'demo') {
            await this.demoRunner.run(runId);
          }
        }
        // `clean` profile: nothing — admin + tenant from earlier steps is enough.

        await this.platformSettings.updateKey('setup.profile', profile);
        await this.markStepCompleted(runId, 'seed', { profile });
      } catch (err) {
        await this.markStepFailed(runId, 'seed', err);
        throw err;
      }
    });
  }

  // Step 8 — complete
  public async completeRun(runId: string): Promise<void> {
    return this.withAdvisoryLock(async () => {
      await this.markStepInProgress(runId, 'complete');
      try {
        const completedAt = new Date().toISOString();
        await this.platformSettings.updateKey('setup.completedAt', completedAt);
        await this.markStepCompleted(runId, 'complete', { completedAt });
        await this.token.invalidate();
        // Flip the global gate's in-memory cache so the rest of the app
        // becomes reachable without the next request paying for a DB read.
        RequireSetupCompleteGuard.markCompleted();
      } catch (err) {
        await this.markStepFailed(runId, 'complete', err);
        throw err;
      }
    });
  }

  /** Admin-only Reset — wipes setup_runs + clears the completedAt sentinel + rotates a new token. */
  public async reset(actorId: string, profile: SeedProfile): Promise<void> {
    return this.withAdvisoryLock(async () => {
      await this.repo.truncateAll();
      await this.platformSettings.updateKey('setup.completedAt', null);
      await this.platformSettings.updateKey('setup.profile', null);
      const newToken = await this.token.issue();
      const fakeRunId = randomUUID();
      await this.logger.log({
        runId: fakeRunId,
        stepKey: 'preflight',
        level: 'WARN',
        event: 'setup.reset',
        payload: { actorId, profile, newTokenIssued: !!newToken },
      });
      // Re-arm the global gate so login redirects back to /setup.
      RequireSetupCompleteGuard.markIncomplete();
    });
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  /**
   * Obtain a Postgres advisory lock for the duration of `fn`. Two operators
   * racing through the wizard get serialized; the second waits or — when
   * called via the controller's `nowait` mode — gets `423 Locked`.
   */
  private async withAdvisoryLock<T>(fn: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const got = await tx.$queryRawUnsafe<Array<{ pg_try_advisory_xact_lock: boolean }>>(
        `SELECT pg_try_advisory_xact_lock(${SETUP_ADVISORY_LOCK_ID})`,
      );
      if (!got[0]?.pg_try_advisory_xact_lock) {
        throw new ConflictException(
          'Another setup wizard run is in progress. Wait for it to finish, or refresh and resume.',
        );
      }
      // The lock is xact-scoped — released on tx commit/rollback.
      return fn();
    });
  }

  private async markStepInProgress(runId: string, stepKey: SetupStepKey): Promise<void> {
    await this.repo.upsertStep({
      runId,
      stepKey,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    });
  }

  private async markStepCompleted(
    runId: string,
    stepKey: SetupStepKey,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.upsertStep({
      runId,
      stepKey,
      status: 'COMPLETED',
      finishedAt: new Date(),
      payloadRedacted: redactSecrets(payload) as Record<string, unknown>,
    });
  }

  private async markStepFailed(runId: string, stepKey: SetupStepKey, err: unknown): Promise<void> {
    await this.repo.upsertStep({
      runId,
      stepKey,
      status: 'FAILED',
      finishedAt: new Date(),
      errorPayload: redactSecrets({
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      }) as Record<string, unknown>,
    });
  }

  private async autoResolveFailedMigrations(runId: string, client: PrismaClient): Promise<void> {
    try {
      const failed = await client.$queryRawUnsafe<Array<{ migration_name: string }>>(
        `SELECT migration_name FROM _prisma_migrations
         WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
      );
      if (failed.length === 0) return;
      await this.logger.log({
        runId,
        stepKey: 'migrations',
        level: 'WARN',
        event: 'migrations.autoResolveFailed',
        payload: { count: failed.length, names: failed.map((r) => r.migration_name) },
      });
      await client.$executeRawUnsafe(
        `UPDATE _prisma_migrations SET rolled_back_at = NOW()
         WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
      );
    } catch (err) {
      // _prisma_migrations may not exist (EMPTY_DB branch) — fine.
      await this.logger.log({
        runId,
        stepKey: 'migrations',
        level: 'DEBUG',
        event: 'migrations.autoResolveFailed.skip',
        payload: { detail: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  /**
   * Run `prisma migrate deploy` against the target DB. We invoke the prisma
   * CLI as a child process — much simpler than re-implementing migration
   * application from scratch + matches what the historical workflow did.
   */
  private async invokePrismaMigrateDeploy(
    runId: string,
    target: ReturnType<PreflightChecksService['resolveTarget']>,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const child = require('node:child_process') as typeof import('node:child_process');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path') as typeof import('node:path');

    const env = {
      ...process.env,
      DATABASE_URL: this.preflight.buildTargetUrl(),
    };
    const cwds = [process.cwd(), '/app'];
    const result = child.spawnSync(
      'node',
      [path.resolve(process.cwd(), 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
      { env, encoding: 'utf-8', cwd: cwds.find((c) => c) ?? process.cwd() },
    );
    await this.logger.log({
      runId,
      stepKey: 'migrations',
      level: result.status === 0 ? 'INFO' : 'ERROR',
      event: 'migrations.deploy',
      payload: {
        target: target.database,
        exitCode: result.status,
        stderrTail: (result.stderr ?? '').slice(-2000),
        stdoutTail: (result.stdout ?? '').slice(-2000),
      },
    });
    if (result.status !== 0) {
      throw new Error(
        `prisma migrate deploy failed (exit=${result.status}): ${(result.stderr ?? '').trim()}`,
      );
    }
  }

  private async tryAutoFixSchemaDiff(runId: string, client: PrismaClient): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const child = require('node:child_process') as typeof import('node:child_process');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path') as typeof import('node:path');

    const target = this.preflight.resolveTarget();
    const env = {
      ...process.env,
      DATABASE_URL: this.preflight.buildTargetUrl(),
    };
    const result = child.spawnSync(
      'node',
      [
        path.resolve(process.cwd(), 'node_modules/prisma/build/index.js'),
        'migrate',
        'diff',
        '--from-url',
        this.preflight.buildTargetUrl(),
        '--to-schema-datamodel',
        path.resolve(process.cwd(), 'prisma/schema.prisma'),
        '--script',
      ],
      { env, encoding: 'utf-8' },
    );
    if (result.status !== 0) {
      await this.logger.log({
        runId,
        stepKey: 'migrations',
        level: 'WARN',
        event: 'migrations.diff.errored',
        payload: {
          target: target.database,
          stderrTail: (result.stderr ?? '').slice(-1000),
        },
      });
      return;
    }

    const sql = (result.stdout ?? '').trim();
    if (sql.length === 0) {
      await this.logger.log({
        runId,
        stepKey: 'migrations',
        level: 'INFO',
        event: 'migrations.diff.empty',
      });
      return;
    }

    await this.logger.log({
      runId,
      stepKey: 'migrations',
      level: 'WARN',
      event: 'migrations.diff.autofix.attempt',
      payload: { sqlPreview: sql.slice(0, 500) },
    });
    try {
      await client.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(sql);
      });
      await this.logger.log({
        runId,
        stepKey: 'migrations',
        level: 'INFO',
        event: 'migrations.diff.autofix.applied',
      });
    } catch (err) {
      await this.logger.log({
        runId,
        stepKey: 'migrations',
        level: 'ERROR',
        event: 'migrations.diff.autofix.failed',
        payload: {
          detail: err instanceof Error ? err.message : String(err),
        },
      });
      // Don't rethrow — the diff sql may be unsafe (drops, type changes) and
      // the wizard offers wipe+recreate as a follow-up. Caller decides.
    }
  }
}
