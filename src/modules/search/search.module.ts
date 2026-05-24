import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { CmdkSearchService } from './application/cmdk-search.service';
import { CmdkSearchController } from './presentation/cmdk-search.controller';

@Module({
  controllers: [CmdkSearchController],
  providers: [
    {
      provide: CmdkSearchService,
      useFactory: (prisma: PrismaService) => new CmdkSearchService(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [CmdkSearchService],
})
export class SearchModule {}
