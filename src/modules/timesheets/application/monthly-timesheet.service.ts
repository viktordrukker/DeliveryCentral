import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PublicHolidayService } from './public-holiday.service';
import { TimeGapDetectionService, TimeGap } from './time-gap-detection.service';

/* ── Response types ── */

export interface MonthlyEntryDto {
  id: string;
  date: string;
  hours: number;
  projectId: string;
  projectCode: string;
  projectName: string;
  assignmentId: string | null;
  benchCategory: string | null;
  capex: boolean;
  description: string | null;
}

export interface MonthlyWeekDto {
  id: string;
  weekStart: string;
  status: string;
  totalHours: number | null;
  overtimeHours: number | null;
}

export interface MonthlyLeaveDay {
  date: string;
  type: string;
  status: string;
}

export interface MonthlyAssignmentRow {
  assignmentId: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  allocationPercent: number;
  isBench: boolean;
  benchCategory: string | null;
}

export interface MonthlySummary {
  workingDays: number;
  expectedHours: number;
  reportedHours: number;
  standardHours: number;
  overtimeHours: number;
  leaveHours: number;
  benchHours: number;
  gapHours: number;
  gapDays: number;
  utilizationPercent: number;
  byProject: Array<{ projectId: string; projectCode: string; projectName: string; hours: number; percent: number }>;
}

export interface MonthlyTimesheetResponse {
  personId: string;
  year: number;
  month: number;
  weeks: MonthlyWeekDto[];
  entries: MonthlyEntryDto[];
  assignmentRows: MonthlyAssignmentRow[];
  leaveDays: MonthlyLeaveDay[];
  holidays: Array<{ date: string; name: string }>;
  gaps: TimeGap[];
  summary: MonthlySummary;
}

@Injectable()
export class MonthlyTimesheetService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly holidayService: PublicHolidayService,
    private readonly gapDetection: TimeGapDetectionService,
  ) {}

  public async getMonth(personId: string, year: number, month: number): Promise<MonthlyTimesheetResponse> {
    const settings = await this.platformSettings.getAll();
    const stdHoursPerDay = settings.timeEntry.standardHoursPerDay;

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));

    // Fetch all timesheet weeks overlapping this month
    const weeks = await this.prisma.timesheetWeek.findMany({
      where: {
        personId,
        weekStart: { lte: monthEnd },
        entries: { some: { date: { gte: monthStart, lte: monthEnd } } },
      },
      include: {
        entries: {
          where: { date: { gte: monthStart, lte: monthEnd } },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { weekStart: 'asc' },
    });

    // Also fetch weeks that exist in the month range even without entries (so we can show their status)
    const allWeeksInMonth = await this.prisma.timesheetWeek.findMany({
      where: {
        personId,
        weekStart: { gte: new Date(Date.UTC(year, month - 1, 1 - 6)), lte: monthEnd },
      },
      select: { id: true, weekStart: true, status: true, totalHours: true, overtimeHours: true },
      orderBy: { weekStart: 'asc' },
    });

    // Fetch projects for entry display
    const projectIds = [...new Set(weeks.flatMap((w) => w.entries.map((e) => e.projectId)))];
    const projects = projectIds.length > 0
      ? await this.prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, name: true, projectCode: true },
        })
      : [];
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    // Fetch active assignments
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        personId,
        status: { in: ['APPROVED', 'ACTIVE'] },
        validFrom: { lte: monthEnd },
        OR: [{ validTo: null }, { validTo: { gte: monthStart } }],
      },
      select: {
        id: true,
        projectId: true,
        allocationPercent: true,
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    // Fetch leave for the month
    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        personId,
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: { startDate: true, endDate: true, type: true, status: true },
    });

    const leaveDays: MonthlyLeaveDay[] = [];
    for (const lr of leaveRequests) {
      const start = lr.startDate > monthStart ? lr.startDate : monthStart;
      const end = lr.endDate < monthEnd ? lr.endDate : monthEnd;
      for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
        leaveDays.push({ date: d.toISOString().slice(0, 10), type: lr.type, status: lr.status });
      }
    }

    // Holidays
    const holidaySet = await this.holidayService.getHolidayDatesForMonth(year, month);
    const holidayList = await this.holidayService.list(year);
    const holidays = holidayList.filter((h) => holidaySet.has(h.date)).map((h) => ({ date: h.date, name: h.name }));

    // Gaps
    const gaps = settings.timeEntry.gapDetectionEnabled
      ? await this.gapDetection.detectGaps(personId, year, month)
      : [];

    // Build entries
    const entries: MonthlyEntryDto[] = weeks.flatMap((w) =>
      w.entries.map((e) => {
        const proj = projectMap.get(e.projectId);
        return {
          id: e.id,
          date: e.date.toISOString().slice(0, 10),
          hours: Number(e.hours),
          projectId: e.projectId,
          projectCode: proj?.projectCode ?? 'UNKNOWN',
          projectName: proj?.name ?? e.projectId,
          assignmentId: e.assignmentId,
          benchCategory: e.benchCategory,
          capex: e.capex,
          description: e.description,
        };
      }),
    );

    // Build assignment rows (for the calendar grid row headers)
    const assignmentRows: MonthlyAssignmentRow[] = assignments.map((a) => ({
      assignmentId: a.id,
      projectId: a.project.id,
      projectCode: a.project.projectCode,
      projectName: a.project.name,
      allocationPercent: Number(a.allocationPercent ?? 0),
      isBench: false,
      benchCategory: null,
    }));

    // Add bench row if enabled and person has any bench entries
    if (settings.timeEntry.benchEnabled) {
      const hasBenchEntries = entries.some((e) => e.benchCategory !== null);
      if (hasBenchEntries || assignments.length === 0) {
        assignmentRows.push({
          assignmentId: '',
          projectId: '',
          projectCode: 'BENCH',
          projectName: 'Bench Time',
          allocationPercent: 0,
          isBench: true,
          benchCategory: null,
        });
      }
    }

    // Compute summary
    const workingDays = await this.holidayService.workingDaysInMonth(year, month);
    const approvedLeaveDays = leaveDays.filter((l) => l.status === 'APPROVED').length;
    const effectiveWorkingDays = workingDays - approvedLeaveDays;
    const expectedHours = effectiveWorkingDays * stdHoursPerDay;
    const reportedHours = entries.reduce((s, e) => s + e.hours, 0);
    const benchHours = entries.filter((e) => e.benchCategory !== null).reduce((s, e) => s + e.hours, 0);
    const leaveHours = approvedLeaveDays * stdHoursPerDay;
    const standardHours = Math.min(reportedHours, effectiveWorkingDays * stdHoursPerDay);
    const overtimeHours = Math.max(0, reportedHours - effectiveWorkingDays * stdHoursPerDay);
    const gapHours = Math.max(0, expectedHours - reportedHours);
    const gapDays = gaps.length;

    // By project
    const byProjectMap = new Map<string, { hours: number; code: string; name: string }>();
    for (const e of entries) {
      const key = e.benchCategory ? 'BENCH' : e.projectId;
      const acc = byProjectMap.get(key) ?? { hours: 0, code: e.benchCategory ? 'BENCH' : e.projectCode, name: e.benchCategory ? 'Bench Time' : e.projectName };
      acc.hours += e.hours;
      byProjectMap.set(key, acc);
    }

    const byProject = Array.from(byProjectMap.entries())
      .map(([id, { hours, code, name }]) => ({
        projectId: id,
        projectCode: code,
        projectName: name,
        hours: Math.round(hours * 10) / 10,
        percent: reportedHours > 0 ? Math.round((hours / reportedHours) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.hours - a.hours);

    const summary: MonthlySummary = {
      workingDays,
      expectedHours: Math.round(expectedHours * 10) / 10,
      reportedHours: Math.round(reportedHours * 10) / 10,
      standardHours: Math.round(standardHours * 10) / 10,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      leaveHours: Math.round(leaveHours * 10) / 10,
      benchHours: Math.round(benchHours * 10) / 10,
      gapHours: Math.round(gapHours * 10) / 10,
      gapDays,
      utilizationPercent: expectedHours > 0 ? Math.round((reportedHours / expectedHours) * 1000) / 10 : 0,
      byProject,
    };

    return {
      personId,
      year,
      month,
      weeks: allWeeksInMonth.map((w) => ({
        id: w.id,
        weekStart: w.weekStart.toISOString().slice(0, 10),
        status: w.status,
        totalHours: w.totalHours ? Number(w.totalHours) : null,
        overtimeHours: w.overtimeHours ? Number(w.overtimeHours) : null,
      })),
      entries,
      assignmentRows,
      leaveDays,
      holidays,
      gaps,
      summary,
    };
  }

  /** Auto-fill a month from assignments: for each working day without entries, fill proportionally. */
  public async autoFill(personId: string, year: number, month: number): Promise<{ filledDays: number; filledHours: number }> {
    const settings = await this.platformSettings.getAll();
    const stdHoursPerDay = settings.timeEntry.standardHoursPerDay;

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));

    // Get holidays and leave
    const holidays = await this.holidayService.getHolidayDatesForMonth(year, month);
    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: { personId, status: 'APPROVED', startDate: { lte: monthEnd }, endDate: { gte: monthStart } },
      select: { startDate: true, endDate: true },
    });
    const leaveDates = new Set<string>();
    for (const lr of leaveRequests) {
      const start = lr.startDate > monthStart ? lr.startDate : monthStart;
      const end = lr.endDate < monthEnd ? lr.endDate : monthEnd;
      for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
        leaveDates.add(d.toISOString().slice(0, 10));
      }
    }

    // Get assignments
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        personId,
        status: { in: ['APPROVED', 'ACTIVE'] },
        validFrom: { lte: monthEnd },
        OR: [{ validTo: null }, { validTo: { gte: monthStart } }],
      },
      select: { projectId: true, allocationPercent: true },
    });

    if (assignments.length === 0) return { filledDays: 0, filledHours: 0 };

    // Get existing entries
    const existingEntries = await this.prisma.timesheetEntry.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        timesheetWeek: { personId },
      },
      select: { date: true },
    });
    const existingDates = new Set(existingEntries.map((e) => e.date.toISOString().slice(0, 10)));

    let filledDays = 0;
    let filledHours = 0;
    const daysInMonth = monthEnd.getUTCDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, month - 1, d));
      const dateStr = date.toISOString().slice(0, 10);
      const dayOfWeek = date.getUTCDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      if (holidays.has(dateStr)) continue;
      if (leaveDates.has(dateStr)) continue;
      if (existingDates.has(dateStr)) continue;

      // Ensure a timesheet week exists
      const weekStart = this.mondayOf(date);
      let week = await this.prisma.timesheetWeek.findUnique({
        where: { personId_weekStart: { personId, weekStart } },
      });
      if (!week) {
        week = await this.prisma.timesheetWeek.create({
          data: { personId, weekStart, status: 'DRAFT' },
        });
      }
      if (week.status !== 'DRAFT') continue; // Don't modify non-draft weeks

      for (const a of assignments) {
        const hours = Math.round((Number(a.allocationPercent) / 100) * stdHoursPerDay * 10) / 10;
        if (hours <= 0) continue;
        await this.prisma.timesheetEntry.upsert({
          where: { timesheetWeekId_projectId_date: { timesheetWeekId: week.id, projectId: a.projectId, date } },
          create: { timesheetWeekId: week.id, projectId: a.projectId, date, hours: new Prisma.Decimal(hours.toFixed(2)) },
          update: {},
        });
        filledHours += hours;
      }
      filledDays++;
    }

    return { filledDays, filledHours: Math.round(filledHours * 10) / 10 };
  }

  /** Copy entries from the previous month's pattern into DRAFT weeks of the target month. */
  public async copyPrevious(personId: string, year: number, month: number): Promise<{ copiedDays: number; copiedHours: number }> {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const prevStart = new Date(Date.UTC(prevYear, prevMonth - 1, 1));
    const prevEnd = new Date(Date.UTC(prevYear, prevMonth, 0));

    // Get previous month's entries grouped by dayOfWeek + projectId
    const prevEntries = await this.prisma.timesheetEntry.findMany({
      where: {
        date: { gte: prevStart, lte: prevEnd },
        timesheetWeek: { personId },
      },
      select: { date: true, projectId: true, hours: true, capex: true, benchCategory: true },
    });

    // Build pattern: dayOfWeek → [{ projectId, hours, capex, benchCategory }]
    const pattern = new Map<number, Array<{ projectId: string; hours: number; capex: boolean; benchCategory: string | null }>>();
    for (const e of prevEntries) {
      const dow = e.date.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      const list = pattern.get(dow) ?? [];
      const existing = list.find((x) => x.projectId === e.projectId);
      if (existing) {
        // Average if multiple weeks have different values
        existing.hours = (existing.hours + Number(e.hours)) / 2;
      } else {
        list.push({ projectId: e.projectId, hours: Number(e.hours), capex: e.capex, benchCategory: e.benchCategory });
      }
      pattern.set(dow, list);
    }

    if (pattern.size === 0) return { copiedDays: 0, copiedHours: 0 };

    // Apply pattern to current month (DRAFT weeks only, no existing entries)
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));
    const holidays = await this.holidayService.getHolidayDatesForMonth(year, month);

    const existingEntries = await this.prisma.timesheetEntry.findMany({
      where: { date: { gte: monthStart, lte: monthEnd }, timesheetWeek: { personId } },
      select: { date: true },
    });
    const existingDates = new Set(existingEntries.map((e) => e.date.toISOString().slice(0, 10)));

    let copiedDays = 0;
    let copiedHours = 0;
    const daysInMonth = monthEnd.getUTCDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, month - 1, d));
      const dateStr = date.toISOString().slice(0, 10);
      const dow = date.getUTCDay();

      if (dow === 0 || dow === 6) continue;
      if (holidays.has(dateStr)) continue;
      if (existingDates.has(dateStr)) continue;

      const dayPattern = pattern.get(dow);
      if (!dayPattern || dayPattern.length === 0) continue;

      const weekStart = this.mondayOf(date);
      let week = await this.prisma.timesheetWeek.findUnique({
        where: { personId_weekStart: { personId, weekStart } },
      });
      if (!week) {
        week = await this.prisma.timesheetWeek.create({
          data: { personId, weekStart, status: 'DRAFT' },
        });
      }
      if (week.status !== 'DRAFT') continue;

      for (const entry of dayPattern) {
        const hours = Math.round(entry.hours * 10) / 10;
        if (hours <= 0) continue;
        await this.prisma.timesheetEntry.upsert({
          where: { timesheetWeekId_projectId_date: { timesheetWeekId: week.id, projectId: entry.projectId, date } },
          create: {
            timesheetWeekId: week.id, projectId: entry.projectId, date,
            hours: new Prisma.Decimal(hours.toFixed(2)), capex: entry.capex,
            benchCategory: entry.benchCategory,
          },
          update: {},
        });
        copiedHours += hours;
      }
      copiedDays++;
    }

    return { copiedDays, copiedHours: Math.round(copiedHours * 10) / 10 };
  }

  private mondayOf(date: Date): Date {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
  }
}
