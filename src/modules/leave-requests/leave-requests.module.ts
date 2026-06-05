import { Module } from '@nestjs/common';

import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { NotificationsModule } from '@src/modules/notifications/notifications.module';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { LeaveRequestsService } from './application/leave-requests.service';
import { LeaveBalanceService } from './application/leave-balance.service';
import { LEAVE_REQUEST_REPOSITORY } from './domain/repositories/leave-request-repository.port';
import { PrismaLeaveRequestRepository } from './infrastructure/repositories/prisma/prisma-leave-request.repository';
import { LeaveRequestsController } from './presentation/leave-requests.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [LeaveRequestsController],
  exports: [LeaveRequestsService, LeaveBalanceService],
  providers: [
    // F-14.2 / 20c-02 — bind the new LeaveRequest repository port to its
    // Prisma adapter so `LeaveRequestsService` doesn't speak Prisma directly.
    {
      inject: [PrismaService],
      provide: LEAVE_REQUEST_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaLeaveRequestRepository(prisma),
    },
    {
      // LEAN-P4-missing-12 — translator injected so create/approve/reject/
      // cancel paths fan out leave.* events to email + in-app + outbox.
      inject: [LEAVE_REQUEST_REPOSITORY, LeaveBalanceService, NotificationEventTranslatorService],
      provide: LeaveRequestsService,
      useFactory: (
        repo: PrismaLeaveRequestRepository,
        balance: LeaveBalanceService,
        translator: NotificationEventTranslatorService,
      ) => new LeaveRequestsService(repo, balance, translator),
    },
    LeaveBalanceService,
  ],
})
export class LeaveRequestsModule {}
