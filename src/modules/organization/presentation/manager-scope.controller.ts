import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AllowSelfScope } from '@src/modules/identity-access/application/self-scope.decorator';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ManagerScopeResponseDto } from '../application/contracts/manager-scope.dto';
import { ManagerScopeQueryService } from '../application/manager-scope-query.service';

@ApiTags('manager-scope')
@Controller('org/managers')
export class ManagerScopeController {
  public constructor(private readonly managerScopeQueryService: ManagerScopeQueryService) {}

  @Get(':id/scope')
  @RequireRoles('hr_manager', 'project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  @AllowSelfScope({ param: 'id' })
  @ApiOperation({ summary: 'Get manager-scoped visibility for reports and dotted-line relationships' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: ManagerScopeResponseDto })
  public async getManagerScope(
    @Param('id', ParseUUIDPipe) managerId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('asOf') asOf?: string,
  ): Promise<ManagerScopeResponseDto> {
    const numericPage = Number(page);
    const numericPageSize = Number(pageSize);

    return this.managerScopeQueryService.getManagerScope({
      asOf,
      managerId,
      page: Number.isNaN(numericPage) ? 1 : numericPage,
      pageSize: Number.isNaN(numericPageSize) ? 10 : numericPageSize,
    });
  }
}
