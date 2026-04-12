import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { FinancialService } from './application/financial.service';
import { FinancialRepository } from './infrastructure/financial.repository';
import { CapitalisationController, PeriodLocksController } from './presentation/capitalisation.controller';
import { PersonCostRateController, ProjectBudgetController } from './presentation/budget.controller';

@Module({
  controllers: [
    CapitalisationController,
    PeriodLocksController,
    ProjectBudgetController,
    PersonCostRateController,
  ],
  providers: [
    {
      provide: FinancialRepository,
      useFactory: (prisma: PrismaService) => new FinancialRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: FinancialService,
      useFactory: (repo: FinancialRepository) => new FinancialService(repo),
      inject: [FinancialRepository],
    },
  ],
  exports: [FinancialService],
})
export class FinancialGovernanceModule {}
