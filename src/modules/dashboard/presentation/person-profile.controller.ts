import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AggregateType, ParsePublicIdOrUuid } from '@src/infrastructure/public-id';
import { AllowSelfScope } from '@src/modules/identity-access/application/self-scope.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { EXEC_ROLES, HR_GOVERNANCE_ROLES } from '@src/shared/auth/role-presets';

import { PersonProfileService } from '../application/person-profile.service';
import { PersonProfileDto } from '../application/contracts/person-profile.dto';

@ApiTags('people')
@Controller('people')
export class PersonProfileController {
  public constructor(private readonly service: PersonProfileService) {}

  @Get(':id/profile')
  // FE-#262 — Self OR HR_GOVERNANCE_ROLES OR EXEC_ROLES. AllowSelfScope
  // makes a non-privileged caller succeed only on their own personId.
  @RequireRoles(...HR_GOVERNANCE_ROLES, ...EXEC_ROLES)
  @AllowSelfScope({ param: 'id' })
  @ApiOperation({
    summary:
      'FE-#262 — Person profile aggregator (identity / assignments / timesheet / leave / ' +
      'manager chain / skills / pools). costRate is redacted unless caller is self / HR / director / admin.',
  })
  @ApiOkResponse({ type: Object })
  public async getProfile(
    @Param('id', ParsePublicIdOrUuid(AggregateType.Person)) personId: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<PersonProfileDto> {
    return this.service.getProfile(personId, {
      callerPersonId: req.principal?.personId,
      callerRoles: req.principal?.roles ?? [],
    });
  }
}
