import { Controller, Get, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { ALL_AUTHENTICATED_ROLES } from '@src/shared/auth/role-presets';

import { MeHomeResponseDto } from '../application/contracts/me-home.dto';
import { MeHomeService } from '../application/me-home.service';

@ApiTags('me')
@Controller('me')
export class MeHomeController {
  public constructor(private readonly service: MeHomeService) {}

  @Get('home')
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({
    summary:
      'FE-#314 — role-aware home payload. Returns { homeKind, payload } where ' +
      'homeKind is the caller\'s top role (director > admin > dm > pm > rm > hr > ' +
      'employee) and payload is the matching dashboard service\'s response.',
  })
  @ApiOkResponse({ type: Object })
  public async getHome(@Req() req: { principal?: RequestPrincipal }): Promise<MeHomeResponseDto> {
    return this.service.getHome(req.principal?.personId, req.principal?.roles ?? []);
  }
}
