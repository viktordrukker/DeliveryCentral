import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { BusinessAuditQueryService } from '../application/business-audit-query.service';
import { BusinessAuditResponseDto } from '../application/contracts/business-audit.dto';

@ApiTags('business-audit')
@Controller('audit/business')
export class BusinessAuditController {
  public constructor(
    private readonly businessAuditQueryService: BusinessAuditQueryService,
  ) {}

  @Get()
  @RequireRoles('admin', 'director', 'hr_manager')
  @ApiOperation({ summary: 'Query business audit records with date range and pagination' })
  @ApiQuery({ name: 'actorId', required: false, type: String })
  @ApiQuery({ name: 'actionType', required: false, type: String })
  @ApiQuery({ name: 'targetEntityType', required: false, type: String })
  @ApiQuery({ name: 'targetEntityId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'ISO date-time lower bound (inclusive)' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'ISO date-time upper bound (inclusive)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: BusinessAuditResponseDto })
  public list(
    @Query('actorId') actorId?: string,
    @Query('actionType') actionType?: string,
    @Query('targetEntityType') targetEntityType?: string,
    @Query('targetEntityId') targetEntityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<BusinessAuditResponseDto> {
    return this.businessAuditQueryService.execute({
      actionType,
      actorId,
      from,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      targetEntityId,
      targetEntityType,
      to,
    });
  }
}
