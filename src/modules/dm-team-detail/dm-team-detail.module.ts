import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { TeamConflictsService } from './application/team-conflicts.service';
import { DmTeamController } from './presentation/dm-team.controller';

@Module({
  controllers: [DmTeamController],
  providers: [
    {
      provide: TeamConflictsService,
      useFactory: (prisma: PrismaService) => new TeamConflictsService(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [TeamConflictsService],
})
export class DmTeamDetailModule {}
