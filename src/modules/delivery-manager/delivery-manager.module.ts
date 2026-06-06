import { Module } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaModule } from '@src/shared/persistence/prisma.module';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { DmEscalationService } from './application/dm-escalation.service';
import { DmEscalationController } from './presentation/dm-escalation.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DmEscalationController],
  providers: [
    {
      provide: DmEscalationService,
      useFactory: (prisma: PrismaService, auditLogger: AuditLoggerService) =>
        new DmEscalationService(prisma, auditLogger),
      inject: [PrismaService, AuditLoggerService],
    },
  ],
  exports: [DmEscalationService],
})
export class DeliveryManagerModule {}
