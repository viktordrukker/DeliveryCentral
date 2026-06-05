import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { SelfEndorseSkillService } from './application/self-endorse-skill.service';
import { SkillsService } from './application/skills.service';
import {
  AdminSkillsController,
  MeSkillsController,
  PersonSkillsController,
  SkillMatchController,
} from './presentation/skills.controller';

@Module({
  controllers: [AdminSkillsController, MeSkillsController, PersonSkillsController, SkillMatchController],
  providers: [PrismaService, SelfEndorseSkillService, SkillsService],
  exports: [SkillsService, SelfEndorseSkillService],
})
export class SkillsModule {}
