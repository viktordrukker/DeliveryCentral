import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ApplyPlannerScenarioService } from './application/apply-planner-scenario.service';
import { ApplyPlannerScenarioController } from './presentation/apply-planner-scenario.controller';

@Module({
  controllers: [ApplyPlannerScenarioController],
  providers: [
    {
      provide: ApplyPlannerScenarioService,
      useFactory: (prisma: PrismaService) => new ApplyPlannerScenarioService(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [ApplyPlannerScenarioService],
})
export class ApplyPlannerScenarioModule {}
