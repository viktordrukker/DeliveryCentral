import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { HR_GOVERNANCE_ROLES } from '@src/shared/auth/role-presets';

import { HrActionCardsService } from '../application/hr-action-cards.service';
import { HrActionCardDto } from '../application/contracts/hr-action-card.dto';

@ApiTags('hr')
@Controller('hr')
export class HrActionCardsController {
  public constructor(private readonly service: HrActionCardsService) {}

  @Get('action-cards')
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  @ApiOperation({
    summary:
      'FE-#263 — HR action-cards. Probation / contract / certification / review prompts ' +
      'sorted by severity DESC then dueAt ASC.',
  })
  @ApiOkResponse({ type: [Object] })
  public async listActionCards(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
  ): Promise<HrActionCardDto[]> {
    return this.service.listActionCards({ page, pageSize });
  }
}
