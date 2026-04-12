import { Module } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { InAppNotificationsModule } from '@src/modules/in-app-notifications/in-app-notifications.module';
import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';

import { PulseService } from './application/pulse.service';
import { PeopleThreeSixtyService } from './application/people-360.service';
import { MoodHeatmapService } from './application/mood-heatmap.service';
import { PulseRepository } from './infrastructure/pulse.repository';
import { PulseController } from './presentation/pulse.controller';
import { PeopleThreeSixtyController } from './presentation/people-360.controller';
import { MoodHeatmapController } from './presentation/mood-heatmap.controller';

@Module({
  imports: [InAppNotificationsModule],
  controllers: [PulseController, PeopleThreeSixtyController, MoodHeatmapController],
  providers: [
    {
      provide: PulseRepository,
      useFactory: (prisma: PrismaService) => new PulseRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: PulseService,
      useFactory: (repo: PulseRepository, prisma: PrismaService, inApp: InAppNotificationService) =>
        new PulseService(repo, prisma, inApp),
      inject: [PulseRepository, PrismaService, InAppNotificationService],
    },
    {
      provide: PeopleThreeSixtyService,
      useFactory: (prisma: PrismaService, repo: PulseRepository) =>
        new PeopleThreeSixtyService(prisma, repo),
      inject: [PrismaService, PulseRepository],
    },
    {
      provide: MoodHeatmapService,
      useFactory: (prisma: PrismaService, repo: PulseRepository) =>
        new MoodHeatmapService(prisma, repo),
      inject: [PrismaService, PulseRepository],
    },
  ],
  exports: [PulseService, PulseRepository, PeopleThreeSixtyService, MoodHeatmapService],
})
export class PulseModule {}
