import { Module } from '@nestjs/common';

import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { NotificationsModule } from '@src/modules/notifications/notifications.module';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { TimesheetsService } from './application/timesheets.service';
import { TimesheetRepository } from './infrastructure/timesheet.repository';
import { TimesheetsController } from './presentation/timesheets.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [TimesheetsController],
  providers: [
    {
      provide: TimesheetRepository,
      useFactory: (prisma: PrismaService) => new TimesheetRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: TimesheetsService,
      useFactory: (repo: TimesheetRepository, notificationEventTranslator: NotificationEventTranslatorService) =>
        new TimesheetsService(repo, notificationEventTranslator),
      inject: [TimesheetRepository, NotificationEventTranslatorService],
    },
  ],
  exports: [TimesheetsService],
})
export class TimesheetsModule {}
