import { Module } from '@nestjs/common';

import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { NotificationsModule } from '@src/modules/notifications/notifications.module';
import { PlatformSettingsModule } from '@src/modules/platform-settings/platform-settings.module';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { TimesheetsService } from './application/timesheets.service';
import { MonthlyTimesheetService } from './application/monthly-timesheet.service';
import { TimeGapDetectionService } from './application/time-gap-detection.service';
import { PublicHolidayService } from './application/public-holiday.service';
import { TimesheetRepository } from './infrastructure/timesheet.repository';
import { TimesheetsController } from './presentation/timesheets.controller';
import { MyTimeController, PublicHolidaysController } from './presentation/my-time.controller';
import { TimeManagementController } from './presentation/time-management.controller';

@Module({
  imports: [NotificationsModule, PlatformSettingsModule],
  controllers: [TimesheetsController, MyTimeController, PublicHolidaysController, TimeManagementController],
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
    PublicHolidayService,
    TimeGapDetectionService,
    MonthlyTimesheetService,
  ],
  exports: [TimesheetsService, PublicHolidayService, MonthlyTimesheetService],
})
export class TimesheetsModule {}
