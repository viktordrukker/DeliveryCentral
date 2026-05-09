import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AbacPolicyRegistry } from './application/abac/abac-policy.registry';
import { AuthenticatedPrincipalFactory } from './application/authenticated-principal.factory';
import { DemoModeGuard } from './application/demo-mode.guard';
import { RbacGuard } from './application/rbac.guard';
import { ResponsibilityResolverService } from './application/responsibility-resolver.service';
import { ResponsibilityRulesAdminService } from './application/responsibility-rules-admin.service';
import { ResponsibilityRulesAdminController } from './presentation/responsibility-rules-admin.controller';

@Global()
@Module({
  controllers: [ResponsibilityRulesAdminController],
  providers: [
    AuthenticatedPrincipalFactory,
    AbacPolicyRegistry,
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
    {
      provide: APP_GUARD,
      useClass: DemoModeGuard,
    },
    {
      provide: ResponsibilityResolverService,
      useFactory: (prisma: PrismaService) => new ResponsibilityResolverService(prisma),
      inject: [PrismaService],
    },
    {
      provide: ResponsibilityRulesAdminService,
      useFactory: (prisma: PrismaService, auditLogger: AuditLoggerService) =>
        new ResponsibilityRulesAdminService(prisma, auditLogger),
      inject: [PrismaService, AuditLoggerService],
    },
  ],
  exports: [
    AuthenticatedPrincipalFactory,
    AbacPolicyRegistry,
    ResponsibilityResolverService,
    ResponsibilityRulesAdminService,
  ],
})
export class IdentityAccessModule {}
