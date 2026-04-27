import { randomUUID } from 'node:crypto';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AppConfig } from '../config/app-config';

/**
 * DM-R-30 — read-replica Prisma client.
 *
 * Dashboards, reports, analytics, and any endpoint that only reads
 * should route through this service rather than the primary `PrismaService`.
 * Isolates adversarial / long-running / pathological read traffic from
 * the OLTP write path, and containment radius during incidents.
 *
 * Behaviour:
 *   - If `READ_REPLICA_DATABASE_URL` is set, connects a Prisma client to
 *     the replica. The replica is READ-ONLY; writes will fail at the
 *     server (replica is in hot_standby mode).
 *   - If the env var is unset, `client` falls back to the primary URL
 *     (`DATABASE_URL`). Deployments without a replica continue working
 *     without code changes.
 *
 * Callers:
 *   - Default `PrismaService` stays the primary (writes).
 *   - New read-oriented services inject `PrismaReadReplicaService`.
 *   - No automatic write routing — opt-in per-service.
 *
 * Application-name tag: `dc::replica::<agent>::<session>` so
 * `pg_stat_activity` on the replica can attribute reads too (DM-R-26).
 */
function withApplicationName(rawUrl: string, agentId: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch (err) {
    // Fail loud — silently routing reads to a malformed URL would mask the misconfiguration. (REPLICA-01)
    throw new Error(
      `READ_REPLICA_DATABASE_URL (or DATABASE_URL fallback) is not a valid URL: ${err instanceof Error ? err.message : 'parse failure'}`,
    );
  }
  const agent = agentId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 16);
  const session = randomUUID().slice(0, 8);
  url.searchParams.set('application_name', `dc::replica::${agent}::${session}`);
  return url.toString();
}

@Injectable()
export class PrismaReadReplicaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaReadReplicaService.name);
  private readonly replicaConfigured: boolean;

  public constructor(appConfig: AppConfig) {
    // CONFIG-02: read replica + agent ID now come from AppConfig instead of
    // direct process.env access.
    const replicaUrl = appConfig.readReplicaDatabaseUrl;
    const effectiveUrl = replicaUrl || appConfig.databaseUrl;
    const tagged = withApplicationName(effectiveUrl, appConfig.agentId);
    super({ datasources: { db: { url: tagged } } });
    this.replicaConfigured = Boolean(replicaUrl);
  }

  public async onModuleInit(): Promise<void> {
    await this.$connect();
    if (this.replicaConfigured) {
      this.logger.log('Read-replica connected (DM-R-30).');
    } else {
      this.logger.warn(
        'READ_REPLICA_DATABASE_URL unset — PrismaReadReplicaService is aliased to the primary. Set the env var in production to route reads off-primary.',
      );
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
