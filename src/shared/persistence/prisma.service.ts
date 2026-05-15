import { randomUUID } from 'node:crypto';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AppConfig } from '../config/app-config';
import {
  PublicIdService,
  registerPublicIdMiddleware,
} from '../../infrastructure/public-id';
import { registerSoftDeleteMiddleware } from './soft-delete.middleware';

const MAX_CONNECT_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

/**
 * F-6.6 / D-143 — env-driven Prisma connection pool sizing.
 *
 * Prisma defaults to `num_physical_cpus * 2 + 1` connections per worker,
 * which on a small container (2-vCPU staging box) lands at 5 — too small
 * under bank-IT concurrency. `DATABASE_POOL_LIMIT` overrides the default;
 * `DATABASE_POOL_TIMEOUT_SECONDS` controls how long a starved request
 * waits before erroring. Both are stamped into the DATABASE_URL as query
 * parameters so every libpq connection inherits them (Prisma's
 * documented pool-tuning seam).
 *
 * Defaults:
 *   DATABASE_POOL_LIMIT           = 20  (per F-6.6 in the plan)
 *   DATABASE_POOL_TIMEOUT_SECONDS = 10
 *
 * Negative / zero / non-numeric values fall back to the defaults; a
 * misconfigured env never disables pooling silently.
 */
const DEFAULT_POOL_LIMIT = 20;
const DEFAULT_POOL_TIMEOUT_SECONDS = 10;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function withConnectionPool(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const limit = parsePositiveInt(process.env.DATABASE_POOL_LIMIT, DEFAULT_POOL_LIMIT);
    const timeout = parsePositiveInt(
      process.env.DATABASE_POOL_TIMEOUT_SECONDS,
      DEFAULT_POOL_TIMEOUT_SECONDS,
    );
    url.searchParams.set('connection_limit', String(limit));
    url.searchParams.set('pool_timeout', String(timeout));
    return url.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * DM-R-26 — tag every Postgres connection from this process with a
 * grep-able `application_name`. Attribution lands in `pg_stat_activity`,
 * `ddl_audit` (via the event trigger in DM-R-21), and Postgres logs.
 *
 * Format: `delivery-central::<service>::<agent-id>::<session-uuid>`
 *   service     — e.g. `backend`, `migrate`. From SERVICE_NAME env, default `backend`.
 *   agent-id    — from AGENT_ID env, default `human`.
 *   session-uuid — freshly generated per process boot.
 *
 * The application_name is stamped into the DATABASE_URL as a query
 * parameter so every libpq connection carries it. Overrides any
 * existing application_name param. Postgres truncates to 63 chars; we
 * stay under that ceiling.
 */
function withApplicationName(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const service = (process.env.SERVICE_NAME || 'backend').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 12);
    const agent = (process.env.AGENT_ID || 'human').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 16);
    const session = randomUUID().slice(0, 8);
    const appName = `dc::${service}::${agent}::${session}`;
    url.searchParams.set('application_name', appName);
    return url.toString();
  } catch {
    // If DATABASE_URL is malformed, fall back to the original; let
    // Prisma surface the connection error on $connect.
    return rawUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  public constructor(appConfig: AppConfig, private readonly publicIdService: PublicIdService) {
    // Layer the URL transformations: pool sizing first, then attribution.
    // Both write to URL search-params so order is incidental, but keeping
    // it deterministic makes the resulting URL stable across boots.
    const tunedUrl = withConnectionPool(withApplicationName(appConfig.databaseUrl));
    super({
      datasources: {
        db: {
          url: tunedUrl,
        },
      },
    });
    // Register publicId generation middleware before any connections are made
    // so `onModuleInit` connect-retries and downstream writes share the same
    // create/createMany hook (DMD-026).
    registerPublicIdMiddleware(this, this.publicIdService);

    // SEC-06: optional soft-delete middleware. Default OFF — flipping it on changes the
    // behavior of every find/delete query for tracked models. Enable per-environment via
    // SOFT_DELETE_MIDDLEWARE_ENABLED=true once all reads/exports that require archived
    // rows have switched to the `__includeArchived: true` escape hatch.
    if (process.env.SOFT_DELETE_MIDDLEWARE_ENABLED === 'true') {
      registerSoftDeleteMiddleware(this);
      this.logger.log('Soft-delete Prisma middleware registered (SEC-06 / DM-8-2).');
    }
  }

  public async onModuleInit(): Promise<void> {
    for (let attempt = 1; attempt <= MAX_CONNECT_RETRIES; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connection established.');
        return;
      } catch (error) {
        if (attempt === MAX_CONNECT_RETRIES) {
          this.logger.error(`Database connection failed after ${MAX_CONNECT_RETRIES} attempts.`);
          throw error;
        }
        this.logger.warn(
          `Database connection attempt ${attempt}/${MAX_CONNECT_RETRIES} failed. Retrying in ${RETRY_DELAY_MS}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
