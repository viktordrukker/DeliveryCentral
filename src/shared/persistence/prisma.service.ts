import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AppConfig } from '../config/app-config';

const MAX_CONNECT_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  public constructor(appConfig: AppConfig) {
    super({
      datasources: {
        db: {
          url: appConfig.databaseUrl,
        },
      },
    });
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
