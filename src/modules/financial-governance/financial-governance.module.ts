import { Module } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { ResponsibilityResolverService } from '@src/modules/identity-access/application/responsibility-resolver.service';
import { NotificationsModule } from '@src/modules/notifications/notifications.module';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { DecideBudgetChangeService } from './application/decide-budget-change.service';
import { EffectiveBillRateResolverService } from './application/effective-bill-rate-resolver.service';
import { FinancialService } from './application/financial.service';
import { RateCardAdminService } from './application/rate-card-admin.service';
import { RequestBudgetChangeService } from './application/request-budget-change.service';
import { FinancialRepository } from './infrastructure/financial.repository';
import { CapitalisationController, PeriodLocksController } from './presentation/capitalisation.controller';
import { PersonCostRateController, ProjectBudgetController } from './presentation/budget.controller';
import { RateCardsAdminController } from './presentation/rate-cards-admin.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [
    CapitalisationController,
    PeriodLocksController,
    ProjectBudgetController,
    PersonCostRateController,
    RateCardsAdminController,
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
    {
      provide: RequestBudgetChangeService,
      useFactory: (
        repo: FinancialRepository,
        prisma: PrismaService,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
        responsibilityResolver: ResponsibilityResolverService,
      ) =>
        new RequestBudgetChangeService(
          repo,
          prisma,
          auditLogger,
          notificationEventTranslator,
          responsibilityResolver,
        ),
      inject: [
        FinancialRepository,
        PrismaService,
        AuditLoggerService,
        NotificationEventTranslatorService,
        ResponsibilityResolverService,
      ],
    },
    {
      provide: DecideBudgetChangeService,
      useFactory: (
        prisma: PrismaService,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
        responsibilityResolver: ResponsibilityResolverService,
      ) =>
        new DecideBudgetChangeService(
          prisma,
          auditLogger,
          notificationEventTranslator,
          responsibilityResolver,
        ),
      inject: [
        PrismaService,
        AuditLoggerService,
        NotificationEventTranslatorService,
        ResponsibilityResolverService,
      ],
    },
    {
      provide: EffectiveBillRateResolverService,
      useFactory: (prisma: PrismaService) => new EffectiveBillRateResolverService(prisma),
      inject: [PrismaService],
    },
    {
      provide: RateCardAdminService,
      useFactory: (prisma: PrismaService, auditLogger: AuditLoggerService) =>
        new RateCardAdminService(prisma, auditLogger),
      inject: [PrismaService, AuditLoggerService],
    },
  ],
  exports: [
    FinancialService,
    RequestBudgetChangeService,
    DecideBudgetChangeService,
    EffectiveBillRateResolverService,
    RateCardAdminService,
  ],
})
export class FinancialGovernanceModule {}
