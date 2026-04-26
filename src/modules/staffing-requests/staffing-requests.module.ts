import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { DeriveStaffingRequestStatusService } from './application/derive-staffing-request-status.service';
import { StaffingSuggestionsService } from './application/staffing-suggestions.service';
import { InMemoryStaffingRequestService } from './infrastructure/services/in-memory-staffing-request.service';
import { StaffingRequestsController } from './presentation/staffing-requests.controller';

@Module({
  controllers: [StaffingRequestsController],
  exports: [InMemoryStaffingRequestService, DeriveStaffingRequestStatusService],
  providers: [
    InMemoryStaffingRequestService,
    DeriveStaffingRequestStatusService,
    {
      provide: StaffingSuggestionsService,
      useFactory: (prisma: PrismaService) => new StaffingSuggestionsService(prisma),
      inject: [PrismaService],
    },
  ],
})
export class StaffingRequestsModule {}
