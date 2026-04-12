import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { LeaveRequestsService } from './application/leave-requests.service';
import { LeaveRequestsController } from './presentation/leave-requests.controller';

@Module({
  controllers: [LeaveRequestsController],
  exports: [LeaveRequestsService],
  providers: [
    {
      inject: [PrismaService],
      provide: LeaveRequestsService,
      useFactory: (prisma: PrismaService) => new LeaveRequestsService(prisma),
    },
  ],
})
export class LeaveRequestsModule {}
