import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ReportBuilderService } from './application/report-builder.service';
import { UtilizationService } from './application/utilization.service';
import { ReportsController } from './presentation/reports.controller';

@Module({
  controllers: [ReportsController],
  exports: [UtilizationService, ReportBuilderService],
  providers: [
    {
      provide: UtilizationService,
      useFactory: (prisma: PrismaService) => new UtilizationService(prisma),
      inject: [PrismaService],
    },
    ReportBuilderService,
  ],
})
export class ReportsModule {}
