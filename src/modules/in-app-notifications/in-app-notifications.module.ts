import { Module } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { InAppNotificationService } from './application/in-app-notification.service';
import { NotificationPreferencesService } from './application/notification-preferences.service';
import { InAppNotificationRepository } from './infrastructure/in-app-notification.repository';
import { InboxController } from './presentation/inbox.controller';
import { MeNotificationPrefsController } from './presentation/me-notification-prefs.controller';
import { NotificationChannelsController } from './presentation/notification-channels.controller';

@Module({
  controllers: [
    InboxController,
    MeNotificationPrefsController,
    NotificationChannelsController,
  ],
  providers: [
    {
      provide: InAppNotificationRepository,
      useFactory: (prisma: PrismaService) => new InAppNotificationRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: InAppNotificationService,
      useFactory: (repo: InAppNotificationRepository) => new InAppNotificationService(repo),
      inject: [InAppNotificationRepository],
    },
    NotificationPreferencesService,
  ],
  exports: [InAppNotificationService, NotificationPreferencesService],
})
export class InAppNotificationsModule {}
