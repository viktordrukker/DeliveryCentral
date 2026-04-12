import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { SkillsService } from '../application/skills.service';
import {
  CreateSkillDto,
  PersonSkillDto,
  SkillDto,
  SkillMatchCandidateDto,
  UpsertPersonSkillItemDto,
} from '../application/contracts/skills.dto';

@ApiTags('admin')
@Controller('admin/skills')
export class AdminSkillsController {
  public constructor(private readonly service: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'List all skills in the skill dictionary' })
  @ApiOkResponse({ type: [SkillDto] })
  public async list(): Promise<SkillDto[]> {
    return this.service.listSkills();
  }

  @Post()
  @RequireRoles('admin', 'hr_manager')
  @ApiOperation({ summary: 'Create a new skill' })
  @ApiOkResponse({ type: SkillDto })
  public async create(@Body() dto: CreateSkillDto): Promise<SkillDto> {
    return this.service.createSkill(dto);
  }

  @Delete(':id')
  @RequireRoles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a skill and all person associations' })
  @ApiNoContentResponse()
  public async remove(@Param('id') id: string): Promise<void> {
    return this.service.deleteSkill(id);
  }
}

@ApiTags('people')
@Controller('people')
export class PersonSkillsController {
  public constructor(private readonly service: SkillsService) {}

  @Get(':id/skills')
  @ApiOperation({ summary: 'Get skills for a person' })
  @ApiOkResponse({ type: [PersonSkillDto] })
  public async getPersonSkills(@Param('id') personId: string): Promise<PersonSkillDto[]> {
    return this.service.getPersonSkills(personId);
  }

  @Put(':id/skills')
  @RequireRoles('admin', 'hr_manager', 'resource_manager', 'delivery_manager', 'director', 'employee')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace all skills for a person' })
  @ApiOkResponse({ type: [PersonSkillDto] })
  public async upsertPersonSkills(
    @Param('id') personId: string,
    @Body() items: UpsertPersonSkillItemDto[],
  ): Promise<PersonSkillDto[]> {
    return this.service.upsertPersonSkills(personId, items);
  }
}

@ApiTags('assignments')
@Controller('assignments')
export class SkillMatchController {
  public constructor(private readonly service: SkillsService) {}

  @Get('skill-match')
  @RequireRoles('admin', 'resource_manager', 'delivery_manager', 'director', 'project_manager')
  @ApiOperation({ summary: 'Find people matching all given skills with capacity < 100%' })
  @ApiQuery({ name: 'skills', required: true, description: 'Comma-separated skill IDs or names' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOkResponse({ type: [SkillMatchCandidateDto] })
  public async skillMatch(
    @Query('skills') skills: string,
    @Query('projectId') projectId?: string,
  ): Promise<SkillMatchCandidateDto[]> {
    const skillIds = skills.split(',').map((s) => s.trim()).filter(Boolean);
    return this.service.skillMatch(skillIds, projectId);
  }
}
