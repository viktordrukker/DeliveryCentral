import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseArrayPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { STAFFING_ROLES } from '@src/shared/auth/role-presets';

import { UnifiedApprovalQueueService } from '../application/unified-approval-queue.service';
import {
  ApprovalQueueResponseDto,
  ApprovalQueueSource,
} from '../application/contracts/approval-queue-item.dto';

@ApiTags('approvals')
@Controller('approvals')
export class UnifiedApprovalQueueController {
  public constructor(private readonly service: UnifiedApprovalQueueService) {}

  @Get('unified')
  @RequireRoles(...STAFFING_ROLES)
  @ApiOperation({
    summary:
      'FE-#264 — unified approval queue aggregating position-proposal / budget / ' +
      'activation / leave / case sources. SLA fields land when issue #257 ships.',
  })
  @ApiOkResponse({ type: Object })
  public async list(
    @Query(
      'source',
      new DefaultValuePipe([]),
      new ParseArrayPipe({ items: String, separator: ',', optional: true }),
    )
    sources: string[],
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(25), ParseIntPipe) pageSize: number,
  ): Promise<ApprovalQueueResponseDto> {
    return this.service.list({
      sources: sources as ApprovalQueueSource[],
      page,
      pageSize,
    });
  }
}
