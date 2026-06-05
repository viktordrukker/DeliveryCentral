import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { LeaveImpactPreviewService } from './application/leave-impact-preview.service';
import { LeaveRequestsService } from './application/leave-requests.service';
import { LeaveBalanceService } from './application/leave-balance.service';
import { LEAVE_REQUEST_REPOSITORY } from './domain/repositories/leave-request-repository.port';
import { PrismaLeaveRequestRepository } from './infrastructure/repositories/prisma/prisma-leave-request.repository';
import { LeaveRequestsController } from './presentation/leave-requests.controller';

@Module({
  controllers: [LeaveRequestsController],
  exports: [LeaveRequestsService, LeaveBalanceService, LeaveImpactPreviewService],
  providers: [
    // F-14.2 / 20c-02 — bind the new LeaveRequest repository port to its
    // Prisma adapter so `LeaveRequestsService` doesn't speak Prisma directly.
    {
      inject: [PrismaService],
      provide: LEAVE_REQUEST_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaLeaveRequestRepository(prisma),
    },
    {
      inject: [LEAVE_REQUEST_REPOSITORY, LeaveBalanceService],
      provide: LeaveRequestsService,
      useFactory: (repo: PrismaLeaveRequestRepository, balance: LeaveBalanceService) =>
        new LeaveRequestsService(repo, balance),
    },
    LeaveBalanceService,
    LeaveImpactPreviewService,
  ],
})
export class LeaveRequestsModule {}
