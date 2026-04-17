import { Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { MonthlyTimesheetService, MonthlyTimesheetResponse } from '../application/monthly-timesheet.service';
import { TimeGapDetectionService, TimeGap } from '../application/time-gap-detection.service';
import { PublicHolidayService, PublicHolidayDto } from '../application/public-holiday.service';

@ApiTags('my-time')
@Controller('my-time')
export class MyTimeController {
  public constructor(
    private readonly monthlyService: MonthlyTimesheetService,
    private readonly gapService: TimeGapDetectionService,
    private readonly holidayService: PublicHolidayService,
  ) {}

  @Get('month')
  @RequireRoles('employee', 'resource_manager', 'delivery_manager', 'project_manager', 'hr_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Get monthly timesheet view with entries, leave, gaps, and summary' })
  @ApiQuery({ name: 'month', required: true, type: String, description: 'YYYY-MM format' })
  @ApiQuery({ name: 'personId', required: false, type: String, description: 'Override person (manager viewing team member)' })
  public async getMonth(
    @Query('month') monthStr: string,
    @Query('personId') personIdOverride: string | undefined,
    @Req() req: { principal?: { personId?: string; userId?: string } },
  ): Promise<MonthlyTimesheetResponse> {
    const personId = personIdOverride ?? req.principal?.personId ?? req.principal?.userId ?? '';
    const [yearStr, monthNumStr] = monthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthNumStr, 10);
    return this.monthlyService.getMonth(personId, year, month);
  }

  @Post('auto-fill')
  @RequireRoles('employee', 'resource_manager', 'delivery_manager', 'project_manager', 'hr_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Auto-fill month from assignments' })
  @ApiQuery({ name: 'month', required: true, type: String })
  public async autoFill(
    @Query('month') monthStr: string,
    @Req() req: { principal?: { personId?: string; userId?: string } },
  ): Promise<{ filledDays: number; filledHours: number }> {
    const personId = req.principal?.personId ?? req.principal?.userId ?? '';
    const [yearStr, monthNumStr] = monthStr.split('-');
    return this.monthlyService.autoFill(personId, parseInt(yearStr, 10), parseInt(monthNumStr, 10));
  }

  @Post('copy-previous')
  @RequireRoles('employee', 'resource_manager', 'delivery_manager', 'project_manager', 'hr_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Copy previous month pattern' })
  @ApiQuery({ name: 'month', required: true, type: String })
  public async copyPrevious(
    @Query('month') monthStr: string,
    @Req() req: { principal?: { personId?: string; userId?: string } },
  ): Promise<{ copiedDays: number; copiedHours: number }> {
    const personId = req.principal?.personId ?? req.principal?.userId ?? '';
    const [yearStr, monthNumStr] = monthStr.split('-');
    return this.monthlyService.copyPrevious(personId, parseInt(yearStr, 10), parseInt(monthNumStr, 10));
  }

  @Get('gaps')
  @RequireRoles('employee', 'resource_manager', 'delivery_manager', 'project_manager', 'hr_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Detect time gaps for a month with suggestions' })
  @ApiQuery({ name: 'month', required: true, type: String })
  @ApiQuery({ name: 'personId', required: false, type: String })
  public async getGaps(
    @Query('month') monthStr: string,
    @Query('personId') personIdOverride: string | undefined,
    @Req() req: { principal?: { personId?: string; userId?: string } },
  ): Promise<TimeGap[]> {
    const personId = personIdOverride ?? req.principal?.personId ?? req.principal?.userId ?? '';
    const [yearStr, monthNumStr] = monthStr.split('-');
    return this.gapService.detectGaps(personId, parseInt(yearStr, 10), parseInt(monthNumStr, 10));
  }
}

@ApiTags('public-holidays')
@Controller('public-holidays')
export class PublicHolidaysController {
  public constructor(private readonly holidayService: PublicHolidayService) {}

  @Get()
  @RequireRoles('employee', 'resource_manager', 'delivery_manager', 'project_manager', 'hr_manager', 'director', 'admin')
  @ApiOperation({ summary: 'List public holidays for a year' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'country', required: false, type: String })
  public async list(
    @Query('year') yearStr?: string,
    @Query('country') country?: string,
  ): Promise<PublicHolidayDto[]> {
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getUTCFullYear();
    return this.holidayService.list(year, country ?? 'AU');
  }
}
