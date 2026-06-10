import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeaveRequestType } from '@prisma/client';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ALL_AUTHENTICATED_ROLES, HR_GOVERNANCE_ROLES } from '@src/shared/auth/role-presets';
import { LeaveDecisionBodyDto } from '../application/contracts/leave-decision-body.dto';
import { LeaveBalanceDto, LeaveBalanceService } from '../application/leave-balance.service';
import {
  LeaveImpactPreviewDto,
  LeaveImpactPreviewService,
} from '../application/leave-impact-preview.service';
import {
  CreateLeaveRequestDto,
  LeaveRequestDto,
  LeaveRequestsService,
} from '../application/leave-requests.service';

@ApiTags('leave-requests')
@Controller('leave-requests')
export class LeaveRequestsController {
  public constructor(
    private readonly service: LeaveRequestsService,
    private readonly balanceService: LeaveBalanceService,
    private readonly previewService: LeaveImpactPreviewService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({ summary: 'Submit a leave request' })
  @ApiCreatedResponse({ description: 'Created leave request' })
  public async create(
    @Body() body: CreateLeaveRequestDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<LeaveRequestDto> {
    const personId = this.resolvePersonId(req);
    return this.service.create({ ...body, personId });
  }

  @Get('my')
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({ summary: 'Get own leave requests' })
  @ApiOkResponse({ description: 'Own leave requests' })
  public async getMy(
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<LeaveRequestDto[]> {
    const personId = this.resolvePersonId(req);
    return this.service.findMy(personId);
  }

  @Get('my-balance')
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({ summary: 'Get own leave balances (entitlement / used / pending / remaining per type)' })
  @ApiOkResponse({ description: 'Per-leave-type balance rows for the current calendar year' })
  public async getMyBalance(
    @Req() req: { principal?: RequestPrincipal },
    @Query('year') year?: string,
  ): Promise<LeaveBalanceDto[]> {
    const personId = this.resolvePersonId(req);
    const targetYear = year ? Number(year) : undefined;
    if (year !== undefined && (Number.isNaN(targetYear) || targetYear === undefined)) {
      throw new BadRequestException('year must be a number');
    }
    return this.balanceService.getBalances(personId, targetYear);
  }

  @Get('preview')
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({ summary: 'Preview leave impact (working days, balance after, conflicts) before submitting' })
  @ApiOkResponse({ description: 'Leave impact preview' })
  public async preview(
    @Req() req: { principal?: RequestPrincipal },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('personId') personIdParam?: string,
  ): Promise<LeaveImpactPreviewDto> {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    const leaveType = (type ?? 'ANNUAL') as LeaveRequestType;
    if (!LEAVE_REQUEST_TYPE_VALUES.has(leaveType)) {
      throw new BadRequestException(`Unknown leave type: ${type}`);
    }
    const actorId = this.resolvePersonId(req);
    // Default to the caller; managers/HR may pass a personId to preview
    // on behalf of an employee (read-only — no write).
    const personId = personIdParam ?? actorId;
    return this.previewService.preview({ personId, startDate, endDate, type: leaveType });
  }

  @Get()
  @ApiOperation({ summary: 'List leave requests (manager/HR view)' })
  @ApiOkResponse({ description: 'Leave requests list' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async findAll(
    @Query('personId') personId?: string,
    @Query('status') status?: string,
  ): Promise<LeaveRequestDto[]> {
    return this.service.findAll(personId, status);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a leave request (optional reviewComment)' })
  @ApiOkResponse({ description: 'Approved leave request' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { principal?: RequestPrincipal },
    // Track B.1 — optional decision body. The legacy callers send no body
    // at all; class-validator with `whitelist: true` accepts the empty
    // object case and yields `body.reviewComment === undefined`.
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: LeaveDecisionBodyDto = {} as LeaveDecisionBodyDto,
  ): Promise<LeaveRequestDto> {
    const reviewerId = this.resolvePersonId(req);
    return this.service.approve(id, reviewerId, body.reviewComment);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a leave request (optional reviewComment)' })
  @ApiOkResponse({ description: 'Rejected leave request' })
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  public async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { principal?: RequestPrincipal },
    // Track B.1 — manager Leave Decision Drawer sends the rejection
    // justification here. Body is optional to stay backwards-compatible
    // with the existing no-body POST.
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: LeaveDecisionBodyDto = {} as LeaveDecisionBodyDto,
  ): Promise<LeaveRequestDto> {
    const reviewerId = this.resolvePersonId(req);
    return this.service.reject(id, reviewerId, body.reviewComment);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel own pending leave request (employee-initiated)' })
  @ApiOkResponse({ description: 'Cancelled leave request' })
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  public async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<LeaveRequestDto> {
    const employeeId = this.resolvePersonId(req);
    return this.service.cancelByEmployee(id, employeeId);
  }

  private resolvePersonId(req: { principal?: RequestPrincipal }): string {
    const id = req.principal?.personId ?? req.principal?.userId;
    if (!id) {
      throw new BadRequestException('Could not determine actor identity from request.');
    }
    return id;
  }
}

const LEAVE_REQUEST_TYPE_VALUES: ReadonlySet<LeaveRequestType> = new Set<LeaveRequestType>([
  'ANNUAL',
  'SICK',
  'PARENTAL',
  'COMPASSIONATE',
  'UNPAID',
  'OTHER',
  'OT_OFF',
  'PERSONAL',
  'BEREAVEMENT',
  'STUDY',
]);
