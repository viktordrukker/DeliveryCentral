import { gzipSync } from 'node:zlib';

import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { redactSecrets } from '../domain/redact';
import type { SetupRunsRepositoryPort } from '../domain/setup-runs.repository.port';

import { PreflightChecksService } from './preflight-checks';
import { SETUP_RUNS_REPOSITORY } from './tokens';

/**
 * Assembles the operator's "Download diagnostic bundle" payload.
 *
 * The plan called for a tar.gz with multiple sub-files. To avoid adding
 * a new runtime dep just for tar packing, we ship a single JSON object
 * (gzipped) with every sub-file as a top-level key. Operators paste the
 * decompressed JSON into a chat with whoever is helping them root-cause;
 * everything you'd need is right there.
 */
@Injectable()
export class DiagnosticBundleService {
  public constructor(
    @Inject(SETUP_RUNS_REPOSITORY) private readonly repo: SetupRunsRepositoryPort,
    private readonly preflight: PreflightChecksService,
  ) {}

  public async build(runId: string): Promise<{ filename: string; gzipped: Buffer }> {
    const [steps, logs, pgFacts] = await Promise.all([
      this.repo.listSteps(runId),
      this.repo.listLogs(runId),
      this.collectPgFacts(),
    ]);

    const env = this.redactedEnv();
    const bundle = {
      generatedAt: new Date().toISOString(),
      runId,
      hostNode: process.versions.node,
      steps,
      logs,
      pgFacts,
      env,
    };
    const json = JSON.stringify(bundle, null, 2);
    const gzipped = gzipSync(Buffer.from(json, 'utf-8'));
    const filename = `dc-setup-${runId}-${Date.now()}.json.gz`;
    return { filename, gzipped };
  }

  /** Whitelist environment variables that are safe to surface; redact known secret keys. */
  private redactedEnv(): Record<string, string | undefined> {
    const safe: Record<string, string | undefined> = {};
    const allowList = [
      'NODE_ENV',
      'PORT',
      'API_PREFIX',
      'AUTH_ISSUER',
      'AUTH_AUDIENCE',
      'AUTH_LOCAL_ENABLED',
      'AUTH_LDAP_ENABLED',
      'AUTH_AZURE_AD_ENABLED',
      'NOTIFICATIONS_SMTP_HOST',
      'NOTIFICATIONS_SMTP_PORT',
      'NOTIFICATIONS_SMTP_SECURE',
      'NOTIFICATIONS_EMAIL_FROM_ADDRESS',
      'CORS_ORIGIN',
      'DEMO_MODE',
      'CLEAN_INSTALL',
      'LOG_LEVEL',
      'SERVICE_NAME',
    ];
    for (const k of allowList) {
      safe[k] = process.env[k];
    }
    safe.DATABASE_URL_FINGERPRINT = (process.env.DATABASE_URL ?? '').replace(
      /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/i,
      '$1[REDACTED]$3',
    );
    return redactSecrets(safe);
  }

  private async collectPgFacts(): Promise<Record<string, unknown>> {
    const facts: Record<string, unknown> = {};
    const target = this.preflight.resolveTarget();
    facts.target = {
      host: target.host,
      port: target.port,
      database: target.database,
      user: target.user,
    };
    const client = new PrismaClient({
      datasources: { db: { url: this.preflight.buildTargetUrl() } },
    });
    try {
      facts.serverVersion = (
        await client.$queryRawUnsafe<Array<{ server_version: string }>>(`SHOW server_version`)
      )[0]?.server_version;
      facts.encoding = (
        await client.$queryRawUnsafe<Array<{ server_encoding: string }>>(`SHOW server_encoding`)
      )[0]?.server_encoding;
      try {
        facts.prismaMigrations = await client.$queryRawUnsafe(
          `SELECT migration_name, finished_at, rolled_back_at, started_at
           FROM _prisma_migrations
           ORDER BY started_at`,
        );
      } catch {
        facts.prismaMigrations = null;
      }
      try {
        facts.tables = (
          await client.$queryRawUnsafe<Array<{ tablename: string }>>(
            `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
          )
        ).map((r) => r.tablename);
      } catch {
        facts.tables = null;
      }
    } catch (err) {
      facts.errors = [err instanceof Error ? err.message : String(err)];
    } finally {
      await client.$disconnect();
    }
    return facts;
  }
}
