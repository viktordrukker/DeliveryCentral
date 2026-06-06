import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AllowSelfScope } from '@src/modules/identity-access/application/self-scope.decorator';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ALL_MANAGER_ROLES } from '@src/shared/auth/role-presets';
import { AggregateType, ParsePublicIdOrUuid } from '@src/infrastructure/public-id';
import { ManagerScopeResponseDto } from '../application/contracts/manager-scope.dto';
import { ManagerScopeQueryService } from '../application/manager-scope-query.service';
import { PersonDirectoryQueryService } from '../application/person-directory-query.service';

@ApiTags('manager-scope')
@Controller('org/managers')
export class ManagerScopeController {
  public constructor(
    private readonly managerScopeQueryService: ManagerScopeQueryService,
    private readonly personDirectoryQueryService: PersonDirectoryQueryService,
  ) {}

  @Get(':id/scope')
  @RequireRoles(...ALL_MANAGER_ROLES)
  @AllowSelfScope({ param: 'id' })
  @ApiOperation({ summary: 'Get manager-scoped visibility for reports and dotted-line relationships' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: ManagerScopeResponseDto })
  public async getManagerScope(
    @Param('id', ParsePublicIdOrUuid(AggregateType.Person)) managerId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('asOf') asOf?: string,
  ): Promise<ManagerScopeResponseDto> {
    const numericPage = Number(page);
    const numericPageSize = Number(pageSize);

    // W1-09 — accept either a uuid or `usr_…` publicId on the route. The
    // downstream listManagerScope query joins on reportingLine.managerPersonId
    // (uuid), so resolve a publicId to the underlying uuid first.
    let resolvedManagerId = managerId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(managerId)) {
      const manager = await this.personDirectoryQueryService.getPersonById(managerId);
      if (!manager) {
        throw new NotFoundException('Manager not found.');
      }
      resolvedManagerId = manager.id;
    }

    return this.managerScopeQueryService.getManagerScope({
      asOf,
      managerId: resolvedManagerId,
      page: Number.isNaN(numericPage) ? 1 : numericPage,
      pageSize: Number.isNaN(numericPageSize) ? 10 : numericPageSize,
    });
  }
}
