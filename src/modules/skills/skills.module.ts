import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { SkillsService } from './application/skills.service';
import { AdminSkillsController, PersonSkillsController, SkillMatchController } from './presentation/skills.controller';

@Module({
  controllers: [AdminSkillsController, PersonSkillsController, SkillMatchController],
  providers: [PrismaService, SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
