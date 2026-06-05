import { Module } from '@nestjs/common';

import { NotificationsModule } from '@src/modules/notifications/notifications.module';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { PlannerScenarioService } from './application/planner-scenario.service';
import { PlannerScenariosController } from './presentation/planner-scenarios.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [PlannerScenariosController],
  providers: [
    {
      provide: PlannerScenarioService,
      useFactory: (prisma: PrismaService, translator: NotificationEventTranslatorService) =>
        new PlannerScenarioService(prisma, translator),
      inject: [PrismaService, NotificationEventTranslatorService],
    },
  ],
  exports: [PlannerScenarioService],
})
export class PlannerScenariosModule {}
