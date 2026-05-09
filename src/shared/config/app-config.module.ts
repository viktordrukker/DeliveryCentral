import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AppConfig } from './app-config';
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
  ],
  exports: [AppConfig, PlatformFlagsService],
})
export class AppConfigModule {}
