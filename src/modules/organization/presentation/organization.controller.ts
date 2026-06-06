import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { HR_GOVERNANCE_ROLES } from '@src/shared/auth/role-presets';

import {
  BulkReassignOrgMembershipRequestDto,
  BulkReassignOrgMembershipResponseDto,
} from '../application/contracts/bulk-reassign-org-membership.dto';
import { BulkReassignOrgMembershipService } from '../application/bulk-reassign-org-membership.service';

@ApiTags('organization')
@Controller('org')
export class OrganizationController {
  public constructor(
    private readonly bulkReassignOrgMembershipService: BulkReassignOrgMembershipService,
  ) {}

  /**
   * LEAN-P4-missing-4 — bulk reassign people between org units in one call.
   * HR_GOVERNANCE_ROLES already covers hr_manager + director + admin.
   */
  @Post('bulk-reassign-membership')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  @ApiOperation({ summary: 'Bulk reassign people between org units' })
  @ApiOkResponse({ type: BulkReassignOrgMembershipResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request payload.' })
  @ApiNotFoundResponse({ description: 'Org unit or person not found.' })
  public async bulkReassign(
    @Body() request: BulkReassignOrgMembershipRequestDto,
    @Req() req: { principal?: { personId?: string; userId?: string } },
  ): Promise<BulkReassignOrgMembershipResponseDto> {
    const actorId = req.principal?.personId ?? req.principal?.userId;
    if (!actorId) {
      throw new BadRequestException('Authenticated actor is required.');
    }
    return this.bulkReassignOrgMembershipService.execute({
      personIds: request.personIds,
      toOrgUnitId: request.toOrgUnitId,
      effectiveFrom: request.effectiveFrom,
      reason: request.reason,
      actorId,
    });
  }
}
