import { Module } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { InAppNotificationService } from './application/in-app-notification.service';
import { InAppNotificationRepository } from './infrastructure/in-app-notification.repository';
import { InboxController } from './presentation/inbox.controller';

@Module({
  controllers: [InboxController],
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
  ],
  exports: [InAppNotificationService],
})
export class InAppNotificationsModule {}
