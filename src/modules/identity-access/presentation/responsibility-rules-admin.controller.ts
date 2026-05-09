import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Idempotent } from '@src/shared/http/idempotent.decorator';

import { RequireRoles } from '../application/roles.decorator';
import {
  CreateResponsibilityRuleDto,
  ResponsibilityActionKindStr,
  ResponsibilityRuleResponseDto,
  UpdateResponsibilityRuleDto,
  RESPONSIBILITY_ACTION_KINDS,
} from '../application/contracts/responsibility-rule.dto';
import { ResponsibilityRulesAdminService } from '../application/responsibility-rules-admin.service';

@ApiTags('admin-responsibility-rules')
@Controller('admin/responsibility-rules')
export class ResponsibilityRulesAdminController {
  public constructor(private readonly service: ResponsibilityRulesAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List responsibility rules' })
  @ApiOkResponse({ type: [ResponsibilityRuleResponseDto] })
  @RequireRoles('admin')
  public async list(
    @Query('actionKind') actionKind?: string,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<ResponsibilityRuleResponseDto[]> {
    let typedActionKind: ResponsibilityActionKindStr | undefined;
    if (actionKind) {
      if (!(RESPONSIBILITY_ACTION_KINDS as readonly string[]).includes(actionKind)) {
        throw new BadRequestException(`Unknown actionKind: ${actionKind}`);
      }
      typedActionKind = actionKind as ResponsibilityActionKindStr;
    }
    return this.service.list({
      actionKind: typedActionKind,
      includeArchived: includeArchived === 'true',
    });
  }

  @Post()
  @Idempotent()
  @ApiOperation({ summary: 'Create a responsibility rule' })
  @ApiOkResponse({ type: ResponsibilityRuleResponseDto })
  @RequireRoles('admin')
  public async create(
    @Body() dto: CreateResponsibilityRuleDto,
    @Req() req: { principal?: { personId?: string } },
  ): Promise<ResponsibilityRuleResponseDto> {
    const actorId = req.principal?.personId ?? '';
    if (!actorId) {
      throw new BadRequestException('Authenticated actor required.');
    }
    return this.service.create(dto, actorId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a responsibility rule' })
  @ApiOkResponse({ type: ResponsibilityRuleResponseDto })
  @RequireRoles('admin')
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateResponsibilityRuleDto,
    @Req() req: { principal?: { personId?: string } },
  ): Promise<ResponsibilityRuleResponseDto> {
    const actorId = req.principal?.personId ?? '';
    if (!actorId) {
      throw new BadRequestException('Authenticated actor required.');
    }
    return this.service.update(id, dto, actorId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a responsibility rule (soft delete).' })
  @ApiOkResponse({ type: ResponsibilityRuleResponseDto })
  @RequireRoles('admin')
  public async archive(
    @Param('id') id: string,
    @Req() req: { principal?: { personId?: string } },
  ): Promise<ResponsibilityRuleResponseDto> {
    const actorId = req.principal?.personId ?? '';
    if (!actorId) {
      throw new BadRequestException('Authenticated actor required.');
    }
    return this.service.archive(id, actorId);
  }
}
