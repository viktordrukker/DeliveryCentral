import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AppConfig } from '@src/shared/config/app-config';

import { SetupLoggerService } from './setup-logger.service';

/**
 * Resolved DB lifecycle branch. The wizard's preflight step returns one of
 * these; the UI then renders the matching prompt + recovery actions.
 */
export type PreflightBranch =
  | 'EMPTY_POSTGRES'
  | 'EMPTY_DB'
  | 'MIGRATIONS_OK'
  | 'MIGRATIONS_BEHIND'
  | 'ORPHAN_TABLES'
  | 'MIGRATIONS_AHEAD';

export interface PreflightResult {
  branch: PreflightBranch;
  /** Connection fingerprint (host, port, dbName, server_version). Surfaced in the UI banner. */
  fingerprint: {
    host: string;
    port: number;
    database: string;
    user: string;
    serverVersion: string | null;
  };
  /** Migration delta — populated for MIGRATIONS_BEHIND, MIGRATIONS_OK, MIGRATIONS_AHEAD. */
  migrations: {
    inDb: string[];
    onDisk: string[];
    pending: string[];
    failed: string[];
    ahead: string[]; // in DB but not on disk
  };
  /** Schema diff SQL (empty when DB is in sync). For the auto-fix substep. */
  schemaDiffSql: string | null;
  /** Disk + memory facts surfaced in the UI for transparency. */
  hostFacts: {
    diskFreeGb: number | null;
    memTotalGb: number | null;
  };
}

interface ParsedConnString {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

function parseConnUrl(raw: string): ParsedConnString {
  // Postgres URL: postgres(ql)?://USER[:PASS]@HOST[:PORT]/DB[?…]
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: u.port ? Number.parseInt(u.port, 10) : 5432,
    database: u.pathname.replace(/^\//, ''),
    user: decodeURIComponent(u.username || 'postgres'),
    password: decodeURIComponent(u.password || ''),
  };
}

function buildClusterUrl(target: ParsedConnString): string {
  // Cluster-level connection: same host/port/credentials but pointed at the
  // built-in `postgres` administrative database.
  const auth = `${encodeURIComponent(target.user)}:${encodeURIComponent(target.password)}`;
  return `postgresql://${auth}@${target.host}:${target.port}/postgres?schema=public`;
}

function buildTargetUrl(target: ParsedConnString): string {
  const auth = `${encodeURIComponent(target.user)}:${encodeURIComponent(target.password)}`;
  return `postgresql://${auth}@${target.host}:${target.port}/${target.database}?schema=public`;
}

async function listMigrationsOnDisk(): Promise<string[]> {
  // The committed migration set ships with the image. In dev that's the
  // repo path; in the production image it's `/app/prisma/migrations/`.
  const candidates = [
    path.resolve(process.cwd(), 'prisma/migrations'),
    '/app/prisma/migrations',
  ];
  for (const p of candidates) {
    try {
      const entries = await fs.readdir(p, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => e.name)
        .sort();
    } catch {
      // try next candidate
    }
  }
  return [];
}

@Injectable()
export class PreflightChecksService {
  public constructor(
    private readonly appConfig: AppConfig,
    private readonly logger: SetupLoggerService,
  ) {}

  /**
   * Build the superuser connection URL.
   * Reads PGSUPER_DATABASE_URL if set (preferred — explicit). Falls back to
   * MIGRATE_DATABASE_URL (matches the workflow lift). Last resort: the
   * runtime DATABASE_URL — works only when the runtime user already has
   * superuser privileges (dev setup typically).
   */
  private resolveSuperuserUrl(): string {
    const explicit = process.env.PGSUPER_DATABASE_URL;
    if (explicit) return explicit;
    const migrate = process.env.MIGRATE_DATABASE_URL;
    if (migrate) return migrate;
    return this.appConfig.databaseUrl;
  }

  /**
   * The decision tree from the plan's "Pre-flight DB lifecycle" section.
   * Connects as superuser to the cluster, identifies the branch, and
   * returns enough detail for the UI to render the right next step.
   *
   * Idempotent + side-effect-free. Recovery actions (CREATE DATABASE,
   * DROP SCHEMA, migrate apply, etc.) are issued by SetupService later.
   */
  public async run(runId: string): Promise<PreflightResult> {
    const superUrl = this.resolveSuperuserUrl();
    const target = parseConnUrl(superUrl);

    await this.logger.log({
      runId,
      stepKey: 'preflight',
      level: 'INFO',
      event: 'preflight.connect',
      payload: {
        host: target.host,
        port: target.port,
        database: target.database,
        user: target.user,
      },
    });

    // 1. Cluster-level probe — does the target DB exist?
    const cluster = new PrismaClient({
      datasources: { db: { url: buildClusterUrl(target) } },
    });
    let dbExists = false;
    let serverVersion: string | null = null;
    try {
      const versionRows = await cluster.$queryRawUnsafe<Array<{ server_version: string }>>(
        `SHOW server_version`,
      );
      serverVersion = versionRows[0]?.server_version ?? null;
      const exists = await cluster.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists`,
        target.database,
      );
      dbExists = !!exists[0]?.exists;
    } finally {
      await cluster.$disconnect();
    }

    const fingerprint = {
      host: target.host,
      port: target.port,
      database: target.database,
      user: target.user,
      serverVersion,
    };
    const hostFacts = await this.collectHostFacts();

    if (!dbExists) {
      await this.logger.log({
        runId,
        stepKey: 'preflight',
        level: 'INFO',
        event: 'preflight.branch',
        payload: { branch: 'EMPTY_POSTGRES' },
      });
      return {
        branch: 'EMPTY_POSTGRES',
        fingerprint,
        migrations: { inDb: [], onDisk: await listMigrationsOnDisk(), pending: [], failed: [], ahead: [] },
        schemaDiffSql: null,
        hostFacts,
      };
    }

    // 2. Target-DB probe — schema state
    const onDisk = await listMigrationsOnDisk();
    const targetClient = new PrismaClient({
      datasources: { db: { url: buildTargetUrl(target) } },
    });
    try {
      // 2a. Any tables in `public`?
      const tables = await targetClient.$queryRawUnsafe<Array<{ tablename: string }>>(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
      );
      const tableNames = tables.map((t) => t.tablename);

      if (tableNames.length === 0) {
        await this.logger.log({
          runId,
          stepKey: 'preflight',
          level: 'INFO',
          event: 'preflight.branch',
          payload: { branch: 'EMPTY_DB' },
        });
        return {
          branch: 'EMPTY_DB',
          fingerprint,
          migrations: { inDb: [], onDisk, pending: onDisk, failed: [], ahead: [] },
          schemaDiffSql: null,
          hostFacts,
        };
      }

      // 2b. _prisma_migrations table present?
      const hasMigrationsTable = tableNames.includes('_prisma_migrations');
      if (!hasMigrationsTable) {
        await this.logger.log({
          runId,
          stepKey: 'preflight',
          level: 'WARN',
          event: 'preflight.branch',
          payload: { branch: 'ORPHAN_TABLES', tableSample: tableNames.slice(0, 10) },
        });
        return {
          branch: 'ORPHAN_TABLES',
          fingerprint,
          migrations: { inDb: [], onDisk, pending: [], failed: [], ahead: [] },
          schemaDiffSql: null,
          hostFacts,
        };
      }

      // 2c. Compare migration history vs disk
      const rows = await targetClient.$queryRawUnsafe<
        Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>
      >(
        `SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations`,
      );
      const inDb = rows
        .filter((r) => r.rolled_back_at === null && r.finished_at !== null)
        .map((r) => r.migration_name);
      const failed = rows
        .filter((r) => r.finished_at === null && r.rolled_back_at === null)
        .map((r) => r.migration_name);
      const inDbSet = new Set(inDb);
      const onDiskSet = new Set(onDisk);
      const pending = onDisk.filter((m) => !inDbSet.has(m) && !failed.includes(m));
      const ahead = inDb.filter((m) => !onDiskSet.has(m));

      // Branch decision
      let branch: PreflightBranch;
      if (ahead.length > 0) {
        branch = 'MIGRATIONS_AHEAD';
      } else if (pending.length > 0 || failed.length > 0) {
        branch = 'MIGRATIONS_BEHIND';
      } else {
        branch = 'MIGRATIONS_OK';
      }

      await this.logger.log({
        runId,
        stepKey: 'preflight',
        level: branch === 'MIGRATIONS_AHEAD' ? 'WARN' : 'INFO',
        event: 'preflight.branch',
        payload: {
          branch,
          counts: {
            inDb: inDb.length,
            onDisk: onDisk.length,
            pending: pending.length,
            failed: failed.length,
            ahead: ahead.length,
          },
        },
      });

      return {
        branch,
        fingerprint,
        migrations: { inDb, onDisk, pending, failed, ahead },
        schemaDiffSql: null, // populated post-migration by SetupService
        hostFacts,
      };
    } finally {
      await targetClient.$disconnect();
    }
  }

  /**
   * Best-effort host facts. Fails silently — this is observability, not a gate.
   * - diskFreeGb: tries `df -k /` via spawnSync.
   * - memTotalGb: reads `os.totalmem()`.
   */
  private async collectHostFacts(): Promise<{ diskFreeGb: number | null; memTotalGb: number | null }> {
    let memTotalGb: number | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const os = require('node:os') as typeof import('node:os');
      memTotalGb = Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10;
    } catch {
      // ignore
    }

    let diskFreeGb: number | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const child = require('node:child_process') as typeof import('node:child_process');
      const out = child.spawnSync('df', ['-k', '/']).stdout?.toString() ?? '';
      const lastLine = out.trim().split('\n').slice(-1)[0] ?? '';
      const parts = lastLine.split(/\s+/);
      // Available is the 4th column; df -k reports KB.
      const availKb = Number.parseInt(parts[3] ?? '0', 10);
      if (Number.isFinite(availKb) && availKb > 0) {
        diskFreeGb = Math.round((availKb / 1024 / 1024) * 10) / 10;
      }
    } catch {
      // ignore
    }

    return { diskFreeGb, memTotalGb };
  }

  /** Helper for SetupService — used by EMPTY_POSTGRES branch's CREATE DATABASE step. */
  public resolveTarget(): ParsedConnString {
    return parseConnUrl(this.resolveSuperuserUrl());
  }

  public buildClusterUrl(): string {
    return buildClusterUrl(this.resolveTarget());
  }

  public buildTargetUrl(): string {
    return buildTargetUrl(this.resolveTarget());
  }
}
