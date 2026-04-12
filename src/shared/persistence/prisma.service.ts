import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AppConfig } from '../config/app-config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  public constructor(appConfig: AppConfig) {
    super({
      datasources: {
        db: {
          url: appConfig.databaseUrl,
        },
      },
    });
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
