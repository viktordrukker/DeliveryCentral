import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AllowSelfScope } from '@src/modules/identity-access/application/self-scope.decorator';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { ALL_AUTHENTICATED_ROLES, ALL_MANAGER_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';
import { AggregateType, ParsePublicIdOrUuid } from '@src/infrastructure/public-id';
import { SelfEndorseSkillService } from '../application/self-endorse-skill.service';
import { SkillsService } from '../application/skills.service';
import {
  CreateSkillDto,
  PersonSkillDto,
  SelfEndorseSkillDto,
  SkillDto,
  SkillMatchCandidateDto,
  UpsertPersonSkillItemDto,
} from '../application/contracts/skills.dto';

@ApiTags('admin')
@Controller('admin/skills')
export class AdminSkillsController {
  public constructor(private readonly service: SkillsService) {}

  @Get()
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
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
  @ApiOperation({
    summary: 'Delete a skill and all person associations',
    description:
      'Accepts either the internal uuid (legacy) or the `skl_…` publicId (DMD-026). UUID acceptance is removed in DM-2.5-11.',
  })
  @ApiNoContentResponse()
  public async remove(
    @Param('id', ParsePublicIdOrUuid(AggregateType.Skill)) idOrPublicId: string,
  ): Promise<void> {
    return this.service.deleteSkill(idOrPublicId);
  }
}

@ApiTags('people')
@Controller('people')
export class PersonSkillsController {
  public constructor(private readonly service: SkillsService) {}

  @Get(':id/skills')
  @RequireRoles(...ALL_MANAGER_ROLES)
  @AllowSelfScope({ param: 'id' })
  @ApiOperation({ summary: 'Get skills for a person' })
  @ApiOkResponse({ type: [PersonSkillDto] })
  public async getPersonSkills(@Param('id', ParseUUIDPipe) personId: string): Promise<PersonSkillDto[]> {
    return this.service.getPersonSkills(personId);
  }

  @Put(':id/skills')
  @RequireRoles('admin', 'hr_manager', 'resource_manager', 'delivery_manager', 'director')
  @AllowSelfScope({ param: 'id' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace all skills for a person' })
  @ApiOkResponse({ type: [PersonSkillDto] })
  public async upsertPersonSkills(
    @Param('id', ParseUUIDPipe) personId: string,
    @Body() items: UpsertPersonSkillItemDto[],
  ): Promise<PersonSkillDto[]> {
    return this.service.upsertPersonSkills(personId, items);
  }
}

@ApiTags('me')
@Controller('me/skills')
export class MeSkillsController {
  public constructor(private readonly service: SelfEndorseSkillService) {}

  /**
   * LEAN-P4d-4 — Employee self-endorsement. The caller writes a skill
   * row to their OWN profile without HR review. The row is flagged
   * `selfEndorsed=true` so HR can still surface it as "unverified".
   *
   * RBAC: any authenticated person can act on themselves. The actor is
   * resolved from `req.principal.personId`; no path param is needed.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({ summary: 'Self-endorse a skill on the caller\'s own profile (no HR gate).' })
  @ApiOkResponse({ type: PersonSkillDto })
  public async endorse(
    @Body() dto: SelfEndorseSkillDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<PersonSkillDto> {
    const personId = req.principal?.personId ?? req.principal?.userId;
    if (!personId) {
      throw new BadRequestException('Could not determine actor identity from request.');
    }
    return this.service.endorse(personId, dto.skillId, dto.proficiency);
  }
}

@ApiTags('assignments')
@Controller('assignments')
export class SkillMatchController {
  public constructor(private readonly service: SkillsService) {}

  @Get('skill-match')
  @RequireRoles(...STAFFING_ROLES)
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
