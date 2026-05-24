import { Controller, Get, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { ALL_AUTHENTICATED_ROLES } from '@src/shared/auth/role-presets';

import { SidebarCountsDto } from '../application/contracts/sidebar-counts.dto';
import { SidebarCountsService } from '../application/sidebar-counts.service';

@ApiTags('me')
@Controller('me')
export class SidebarCountsController {
  public constructor(private readonly service: SidebarCountsService) {}

  @Get('sidebar-counts')
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({
    summary:
      'FE-#309 — unified count badges for the canvas 10-item sidebar (projects / ' +
      'approvals / bench / hrQueue). Out-of-scope counts return 0.',
  })
  @ApiOkResponse({ type: Object })
  public async getCounts(@Req() req: { principal?: RequestPrincipal }): Promise<SidebarCountsDto> {
    return this.service.getCounts(req.principal?.roles ?? []);
  }
}
