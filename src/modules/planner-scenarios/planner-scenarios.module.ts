import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { PlannerScenarioService } from './application/planner-scenario.service';
import { PlannerScenariosController } from './presentation/planner-scenarios.controller';

@Module({
  controllers: [PlannerScenariosController],
  providers: [
    {
      provide: PlannerScenarioService,
      useFactory: (prisma: PrismaService) => new PlannerScenarioService(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [PlannerScenarioService],
})
export class PlannerScenariosModule {}
