import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { ALL_AUTHENTICATED_ROLES } from '@src/shared/auth/role-presets';

import { CmdkSearchService } from '../application/cmdk-search.service';
import { CmdkResultDto } from '../application/contracts/cmdk-result.dto';

@ApiTags('search')
@Controller('search')
export class CmdkSearchController {
  public constructor(private readonly service: CmdkSearchService) {}

  @Get('cmdk')
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({
    summary:
      'FE-#270 — global ⌘K search across Person / Project / ProjectPosition / Case / Assignment.',
  })
  @ApiOkResponse({ type: [Object] })
  public async search(
    @Query('q') q: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<CmdkResultDto[]> {
    return this.service.search({ q, limit });
  }
}
