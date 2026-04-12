import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { PlatformSettingsService } from './application/platform-settings.service';
import { PlatformSettingsController } from './presentation/platform-settings.controller';

@Module({
  controllers: [PlatformSettingsController],
  providers: [
    PrismaService,
    PlatformSettingsService,
  ],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
