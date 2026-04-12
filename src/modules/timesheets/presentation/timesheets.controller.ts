import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';

import { TimesheetsService } from '../application/timesheets.service';
import {
  RejectTimesheetDto,
  TimeReportData,
  TimesheetEntryDto,
  TimesheetWeekDto,
  UpsertEntryDto,
} from '../application/contracts/timesheet.dto';

const MANAGER_ROLES = [
  'project_manager',
  'resource_manager',
  'hr_manager',
  'delivery_manager',
  'director',
  'admin',
] as const;

@ApiTags('timesheets')
@Controller()
export class TimesheetsController {
  public constructor(private readonly service: TimesheetsService) {}

  // ─── Employee endpoints ───────────────────────────────────────────────────

  @Get('timesheets/my')
  @ApiOperation({ summary: 'Get or create own weekly timesheet' })
  @ApiQuery({ name: 'weekStart', required: true, type: String })
  @ApiOkResponse({ description: 'Timesheet week' })
  public async getMyWeek(
    @Query('weekStart') weekStart: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<TimesheetWeekDto> {
    const personId = this.resolvePersonId(req);

    try {
      return await this.service.getMyWeek(personId, weekStart);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to get timesheet week.',
      );
    }
  }

  @Put('timesheets/my/entries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert a timesheet entry' })
  @ApiOkResponse({ description: 'Timesheet entry' })
  public async upsertEntry(
    @Body() dto: UpsertEntryDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<TimesheetEntryDto> {
    const personId = this.resolvePersonId(req);

    try {
      return await this.service.upsertEntry(personId, dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save entry.';
      if (message.includes('not found')) throw new NotFoundException(message);
      throw new BadRequestException(message);
    }
  }

  @Post('timesheets/my/:weekStart/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit timesheet week for approval' })
  @ApiOkResponse({ description: 'Updated timesheet week' })
  public async submitWeek(
    @Param('weekStart') weekStart: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<TimesheetWeekDto> {
    const personId = this.resolvePersonId(req);

    try {
      return await this.service.submitWeek(personId, weekStart);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit timesheet.';
      if (message.includes('not found')) throw new NotFoundException(message);
      throw new BadRequestException(message);
    }
  }

  @Get('timesheets/my/history')
  @ApiOperation({ summary: 'Get own timesheet history' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiOkResponse({ description: 'List of timesheet weeks' })
  public async getMyHistory(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() req: { principal?: RequestPrincipal } = {},
  ): Promise<TimesheetWeekDto[]> {
    const personId = this.resolvePersonId(req);
    return this.service.getMyHistory(personId, from, to);
  }

  // ─── Manager / approval endpoints ─────────────────────────────────────────

  @Get('timesheets/approval')
  @RequireRoles(...MANAGER_ROLES)
  @ApiOperation({ summary: 'Get approval queue' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'personId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiOkResponse({ description: 'List of timesheet weeks' })
  public async getApprovalQueue(
    @Query('status') status?: string,
    @Query('personId') personId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<TimesheetWeekDto[]> {
    return this.service.getApprovalQueue({ status, personId, from, to });
  }

  @Post('timesheets/:id/approve')
  @RequireRoles(...MANAGER_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a timesheet' })
  @ApiOkResponse({ description: 'Updated timesheet week' })
  public async approveWeek(
    @Param('id') id: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<TimesheetWeekDto> {
    const approverId = this.resolveUserId(req);

    try {
      return await this.service.approveWeek(id, approverId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve timesheet.';
      if (message.includes('not found')) throw new NotFoundException(message);
      throw new BadRequestException(message);
    }
  }

  @Post('timesheets/:id/reject')
  @RequireRoles(...MANAGER_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a timesheet' })
  @ApiOkResponse({ description: 'Updated timesheet week' })
  public async rejectWeek(
    @Param('id') id: string,
    @Body() dto: RejectTimesheetDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<TimesheetWeekDto> {
    void req;

    try {
      return await this.service.rejectWeek(id, dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject timesheet.';
      if (message.includes('not found')) throw new NotFoundException(message);
      throw new BadRequestException(message);
    }
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  @Get('reports/time')
  @RequireRoles(...MANAGER_ROLES)
  @ApiOperation({ summary: 'Aggregated time report' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'personId', required: false, type: String })
  @ApiOkResponse({ description: 'Time report data' })
  public async getTimeReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('projectId') projectId?: string,
    @Query('personId') personId?: string,
  ): Promise<TimeReportData> {
    return this.service.getTimeReport({ from, to, projectId, personId });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private resolvePersonId(req: { principal?: RequestPrincipal }): string {
    const id = req.principal?.personId ?? req.principal?.userId;

    if (!id) {
      throw new BadRequestException('Could not determine actor identity from request.');
    }

    return id;
  }

  private resolveUserId(req: { principal?: RequestPrincipal }): string {
    return req.principal?.personId ?? req.principal?.userId ?? 'unknown';
  }
}
