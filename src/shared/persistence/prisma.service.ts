import { randomUUID } from 'node:crypto';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AppConfig } from '../config/app-config';
import {
  PublicIdService,
  registerPublicIdMiddleware,
} from '../../infrastructure/public-id';

const MAX_CONNECT_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

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
    const taggedUrl = withApplicationName(appConfig.databaseUrl);
    super({
      datasources: {
        db: {
          url: taggedUrl,
        },
      },
    });
    // Register publicId generation middleware before any connections are made
    // so `onModuleInit` connect-retries and downstream writes share the same
    // create/createMany hook (DMD-026).
    registerPublicIdMiddleware(this, this.publicIdService);
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
