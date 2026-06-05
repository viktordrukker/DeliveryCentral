import { Module } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { SelfEndorseSkillService } from './application/self-endorse-skill.service';
import { SkillEndorsementService } from './application/skill-endorsement.service';
import { SkillsService } from './application/skills.service';
import {
  AdminSkillsController,
  MeSkillsController,
  PersonSkillsController,
  SkillMatchController,
} from './presentation/skills.controller';

@Module({
  controllers: [AdminSkillsController, MeSkillsController, PersonSkillsController, SkillMatchController],
  providers: [
    PrismaService,
    SelfEndorseSkillService,
    SkillsService,
    {
      provide: SkillEndorsementService,
      useFactory: (prisma: PrismaService, auditLogger: AuditLoggerService) =>
        new SkillEndorsementService(prisma, auditLogger),
      inject: [PrismaService, AuditLoggerService],
    },
  ],
  exports: [SkillsService, SelfEndorseSkillService, SkillEndorsementService],
})
export class SkillsModule {}
