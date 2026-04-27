import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PublicHolidayService } from '../application/public-holiday.service';

/* ── Response types ── */

interface ApprovalQueueItem {
  id: string;
  type: 'timesheet' | 'leave';
  personId: string;
  personName: string;
  weekStart?: string;
  totalHours?: number;
  overtimeHours?: number;
  status: string;
  submittedAt: string | null;
  leaveType?: string;
  leaveStartDate?: string;
  leaveEndDate?: string;
  leaveDays?: number;
  notes?: string;
}

interface TeamCalendarDay {
  date: string;
  type: string; // leave type or 'HOLIDAY'
}

interface TeamCalendarPerson {
  personId: string;
  displayName: string;
  days: TeamCalendarDay[];
}

interface ComplianceRow {
  personId: string;
  displayName: string;
  totalWeeks: number;
  submittedWeeks: number;
  approvedWeeks: number;
  rejectedWeeks: number;
  draftWeeks: number;
  reportedHours: number;
  expectedHours: number;
  gapDays: number;
  overtimeHours: number;
  leaveDays: number;
  status: 'compliant' | 'partial' | 'non-compliant';
}

@ApiTags('time-management')
@Controller('time-management')
@RequireRoles('project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin')
export class TimeManagementController {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly holidayService: PublicHolidayService,
  ) {}

  @Get('queue')
  @ApiOperation({ summary: 'Unified approval queue: timesheets + leave requests' })
  @ApiQuery({ name: 'month', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiOkResponse({ description: 'Mixed list of timesheets and leave requests awaiting approval.' })
  public async getQueue(
    @Query('month') monthStr?: string,
    @Query('status') status?: string,
  ): Promise<ApprovalQueueItem[]> {
    const now = new Date();
    const year = monthStr ? parseInt(monthStr.split('-')[0], 10) : now.getUTCFullYear();
    const month = monthStr ? parseInt(monthStr.split('-')[1], 10) : now.getUTCMonth() + 1;
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));

    const items: ApprovalQueueItem[] = [];

    // Timesheet weeks
    const tsWhere: Record<string, unknown> = {
      weekStart: { gte: monthStart, lte: monthEnd },
    };
    if (status) tsWhere.status = status;
    else tsWhere.status = 'SUBMITTED';

    const timesheets = await this.prisma.timesheetWeek.findMany({
      where: tsWhere,
      include: {
        entries: { select: { hours: true } },
      },
      orderBy: { weekStart: 'asc' },
    });

    // Get person names
    const personIds = [...new Set(timesheets.map((t) => t.personId))];
    const people = personIds.length > 0
      ? await this.prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, displayName: true } })
      : [];
    const personMap = new Map(people.map((p) => [p.id, p.displayName]));

    for (const ts of timesheets) {
      const totalHours = ts.entries.reduce((s, e) => s + Number(e.hours), 0);
      items.push({
        id: ts.id,
        type: 'timesheet',
        personId: ts.personId,
        personName: personMap.get(ts.personId) ?? ts.personId,
        weekStart: ts.weekStart.toISOString().slice(0, 10),
        totalHours: Math.round(totalHours * 10) / 10,
        overtimeHours: ts.overtimeHours ? Number(ts.overtimeHours) : Math.max(0, totalHours - 40),
        status: ts.status,
        submittedAt: ts.submittedAt?.toISOString() ?? null,
      });
    }

    // Leave requests
    const leaveWhere: Record<string, unknown> = {
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    };
    if (status === 'SUBMITTED') leaveWhere.status = 'PENDING';
    else if (status) leaveWhere.status = status;
    else leaveWhere.status = 'PENDING';

    const leaves = await this.prisma.leaveRequest.findMany({
      where: leaveWhere,
      orderBy: { startDate: 'asc' },
    });

    const leavePersonIds = [...new Set(leaves.map((l) => l.personId))];
    const leavePeople = leavePersonIds.length > 0
      ? await this.prisma.person.findMany({ where: { id: { in: leavePersonIds } }, select: { id: true, displayName: true } })
      : [];
    const leavePersonMap = new Map(leavePeople.map((p) => [p.id, p.displayName]));

    for (const lr of leaves) {
      const start = lr.startDate;
      const end = lr.endDate;
      const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
      items.push({
        id: lr.id,
        type: 'leave',
        personId: lr.personId,
        personName: leavePersonMap.get(lr.personId) ?? lr.personId,
        status: lr.status,
        submittedAt: lr.createdAt.toISOString(),
        leaveType: lr.type,
        leaveStartDate: start.toISOString().slice(0, 10),
        leaveEndDate: end.toISOString().slice(0, 10),
        leaveDays: days,
        notes: lr.notes ?? undefined,
      });
    }

    return items;
  }

  @Get('team-calendar')
  @ApiOperation({ summary: 'Team absence calendar for a month' })
  @ApiQuery({ name: 'month', required: true, type: String })
  @ApiOkResponse({ description: 'Per-person calendar of leave and holiday days for the requested month.' })
  public async getTeamCalendar(@Query('month') monthStr: string): Promise<TeamCalendarPerson[]> {
    const [yearStr, monthNumStr] = monthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthNumStr, 10);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));

    // Get all approved leave in the month
    const leaves = await this.prisma.leaveRequest.findMany({
      where: { status: 'APPROVED', startDate: { lte: monthEnd }, endDate: { gte: monthStart } },
      select: { personId: true, startDate: true, endDate: true, type: true },
    });

    // Get holidays
    const holidays = await this.holidayService.getHolidayDatesForMonth(year, month);

    // Group by person
    const personMap = new Map<string, TeamCalendarDay[]>();
    for (const lr of leaves) {
      const days = personMap.get(lr.personId) ?? [];
      const start = lr.startDate > monthStart ? lr.startDate : monthStart;
      const end = lr.endDate < monthEnd ? lr.endDate : monthEnd;
      for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
        days.push({ date: d.toISOString().slice(0, 10), type: lr.type });
      }
      personMap.set(lr.personId, days);
    }

    // Get person names
    const personIds = [...personMap.keys()];
    const people = personIds.length > 0
      ? await this.prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, displayName: true } })
      : [];
    const nameMap = new Map(people.map((p) => [p.id, p.displayName]));

    return Array.from(personMap.entries()).map(([pid, days]) => ({
      personId: pid,
      displayName: nameMap.get(pid) ?? pid,
      days,
    }));
  }

  @Get('compliance')
  @ApiOperation({ summary: 'Team time compliance status for a month' })
  @ApiQuery({ name: 'month', required: true, type: String })
  @ApiOkResponse({ description: 'Per-person compliance status, gap days, and overtime totals.' })
  public async getCompliance(@Query('month') monthStr: string): Promise<ComplianceRow[]> {
    const [yearStr, monthNumStr] = monthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthNumStr, 10);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));

    const settings = await this.platformSettings.getAll();
    const stdHoursPerDay = settings.timeEntry.standardHoursPerDay;
    const workingDays = await this.holidayService.workingDaysInMonth(year, month);

    // Get all timesheet weeks in the month
    const weeks = await this.prisma.timesheetWeek.findMany({
      where: { weekStart: { gte: new Date(Date.UTC(year, month - 1, 1 - 6)), lte: monthEnd } },
      include: { entries: { where: { date: { gte: monthStart, lte: monthEnd } }, select: { hours: true } } },
    });

    // Group by person
    interface PersonAcc { submitted: number; approved: number; rejected: number; draft: number; totalHours: number; otHours: number }
    const personAccMap = new Map<string, PersonAcc>();

    for (const w of weeks) {
      const acc = personAccMap.get(w.personId) ?? { submitted: 0, approved: 0, rejected: 0, draft: 0, totalHours: 0, otHours: 0 };
      if (w.status === 'SUBMITTED') acc.submitted++;
      else if (w.status === 'APPROVED') acc.approved++;
      else if (w.status === 'REJECTED') acc.rejected++;
      else acc.draft++;
      const weekHours = w.entries.reduce((s, e) => s + Number(e.hours), 0);
      acc.totalHours += weekHours;
      acc.otHours += Math.max(0, weekHours - 40);
      personAccMap.set(w.personId, acc);
    }

    // Get leave days
    const allLeave = await this.prisma.leaveRequest.findMany({
      where: { status: 'APPROVED', startDate: { lte: monthEnd }, endDate: { gte: monthStart } },
      select: { personId: true, startDate: true, endDate: true },
    });
    const leaveDaysByPerson = new Map<string, number>();
    for (const lr of allLeave) {
      const start = lr.startDate > monthStart ? lr.startDate : monthStart;
      const end = lr.endDate < monthEnd ? lr.endDate : monthEnd;
      const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
      leaveDaysByPerson.set(lr.personId, (leaveDaysByPerson.get(lr.personId) ?? 0) + days);
    }

    // Get person names
    const personIds = [...personAccMap.keys()];
    const people = personIds.length > 0
      ? await this.prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, displayName: true } })
      : [];
    const nameMap = new Map(people.map((p) => [p.id, p.displayName]));

    return personIds.map((pid) => {
      const acc = personAccMap.get(pid)!;
      const totalWeeks = acc.submitted + acc.approved + acc.rejected + acc.draft;
      const leaveDays = leaveDaysByPerson.get(pid) ?? 0;
      const expectedHours = (workingDays - leaveDays) * stdHoursPerDay;
      const gapDays = Math.max(0, Math.ceil((expectedHours - acc.totalHours) / stdHoursPerDay));
      const allSubmitted = acc.draft === 0;
      const allApproved = acc.approved === totalWeeks;
      const status: ComplianceRow['status'] = allApproved ? 'compliant' : allSubmitted ? 'partial' : 'non-compliant';

      return {
        personId: pid,
        displayName: nameMap.get(pid) ?? pid,
        totalWeeks,
        submittedWeeks: acc.submitted,
        approvedWeeks: acc.approved,
        rejectedWeeks: acc.rejected,
        draftWeeks: acc.draft,
        reportedHours: Math.round(acc.totalHours * 10) / 10,
        expectedHours: Math.round(expectedHours * 10) / 10,
        gapDays,
        overtimeHours: Math.round(acc.otHours * 10) / 10,
        leaveDays,
        status,
      };
    }).sort((a, b) => {
      const order = { 'non-compliant': 0, partial: 1, compliant: 2 };
      return order[a.status] - order[b.status];
    });
  }
}
