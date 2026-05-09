import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { HelpService } from './application/help.service';
import { HelpAdminController } from './presentation/help-admin.controller';
import { HelpController } from './presentation/help.controller';

@Module({
  controllers: [HelpController, HelpAdminController],
  providers: [
    {
      provide: HelpService,
      useFactory: (prisma: PrismaService) => new HelpService(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [HelpService],
})
export class HelpCenterModule {}
