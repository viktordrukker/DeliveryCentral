import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AppConfig } from './app-config';
import { FeatureFlagGuard } from './feature-flag.guard';
import { PlatformFlagsService } from './platform-flags.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
  ],
  providers: [
    AppConfig,
    {
      provide: PlatformFlagsService,
      useFactory: (prisma?: PrismaService) => new PlatformFlagsService(prisma),
      inject: [{ token: PrismaService, optional: true }],
    },
    FeatureFlagGuard,
  ],
  exports: [AppConfig, PlatformFlagsService, FeatureFlagGuard],
})
export class AppConfigModule {}
