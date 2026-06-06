import { Module } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { ResponsibilityResolverService } from '@src/modules/identity-access/application/responsibility-resolver.service';
import { NotificationsModule } from '@src/modules/notifications/notifications.module';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PlatformSettingsModule } from '@src/modules/platform-settings/platform-settings.module';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PlatformFlagsService } from '@src/shared/config/platform-flags.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { BudgetApprovalAutoTriggerService } from './application/budget-approval-auto-trigger.service';
import { DecideBudgetChangeService } from './application/decide-budget-change.service';
import { EffectiveBillRateResolverService } from './application/effective-bill-rate-resolver.service';
import { CpiWhatIfService } from './application/cpi-what-if.service';
import { EvmComputationService } from './application/evm-computation.service';
import { FinancialService } from './application/financial.service';
import { FiscalCalendarService } from './application/fiscal-calendar.service';
import { FxRateService } from './application/fx-rate.service';
import { RateCardAdminService } from './application/rate-card-admin.service';
import { RequestBudgetChangeService } from './application/request-budget-change.service';
import { FinancialRepository } from './infrastructure/financial.repository';
import { CapitalisationController, PeriodLocksController } from './presentation/capitalisation.controller';
import { PersonCostRateController, ProjectBudgetController } from './presentation/budget.controller';
import { AdminEvmController, ProjectEvmController } from './presentation/evm.controller';
import { RateCardsAdminController } from './presentation/rate-cards-admin.controller';

@Module({
  imports: [NotificationsModule, PlatformSettingsModule],
  controllers: [
    CapitalisationController,
    PeriodLocksController,
    ProjectBudgetController,
    PersonCostRateController,
    RateCardsAdminController,
    ProjectEvmController,
    AdminEvmController,
  ],
  providers: [
    {
      provide: FinancialRepository,
      useFactory: (prisma: PrismaService) => new FinancialRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: BudgetApprovalAutoTriggerService,
      useFactory: (prisma: PrismaService, settings: PlatformSettingsService) =>
        new BudgetApprovalAutoTriggerService(prisma, settings),
      inject: [PrismaService, PlatformSettingsService],
    },
    {
      provide: FinancialService,
      useFactory: (
        repo: FinancialRepository,
        autoTrigger: BudgetApprovalAutoTriggerService,
      ) => new FinancialService(repo, undefined, autoTrigger),
      inject: [FinancialRepository, BudgetApprovalAutoTriggerService],
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
    {
      provide: FxRateService,
      useFactory: (prisma: PrismaService, flags: PlatformFlagsService) =>
        new FxRateService(prisma, flags),
      inject: [PrismaService, PlatformFlagsService],
    },
    {
      provide: FiscalCalendarService,
      useFactory: (prisma: PrismaService, flags: PlatformFlagsService) =>
        new FiscalCalendarService(prisma, flags),
      inject: [PrismaService, PlatformFlagsService],
    },
    {
      provide: EvmComputationService,
      useFactory: (prisma: PrismaService) => new EvmComputationService(prisma),
      inject: [PrismaService],
    },
    {
      provide: CpiWhatIfService,
      useFactory: (prisma: PrismaService, evm: EvmComputationService) =>
        new CpiWhatIfService(prisma, evm),
      inject: [PrismaService, EvmComputationService],
    },
  ],
  exports: [
    FinancialService,
    RequestBudgetChangeService,
    DecideBudgetChangeService,
    EffectiveBillRateResolverService,
    RateCardAdminService,
    FxRateService,
    FiscalCalendarService,
    EvmComputationService,
    CpiWhatIfService,
    BudgetApprovalAutoTriggerService,
  ],
})
export class FinancialGovernanceModule {}
