import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PublicHolidayService } from './public-holiday.service';

export interface TimeGap {
  date: string;
  dayOfWeek: string;
  expectedHours: number;
  reportedHours: number;
  gapHours: number;
  isHoliday: boolean;
  isLeave: boolean;
  leaveType: string | null;
  suggestions: GapSuggestion[];
}

export interface GapSuggestion {
  type: 'assignment' | 'bench' | 'leave';
  label: string;
  hours: number;
  projectId?: string;
  projectCode?: string;
  benchCategory?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Injectable()
export class TimeGapDetectionService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly holidayService: PublicHolidayService,
  ) {}

  public async detectGaps(personId: string, year: number, month: number): Promise<TimeGap[]> {
    const settings = await this.platformSettings.getAll();
    const stdHoursPerDay = settings.timeEntry.standardHoursPerDay;

    // Get holidays for the month
    const holidays = await this.holidayService.getHolidayDatesForMonth(year, month);

    // Get approved leave for the month
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));
    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        personId,
        status: 'APPROVED',
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: { startDate: true, endDate: true, type: true },
    });

    // Build leave day set
    const leaveDays = new Map<string, string>();
    for (const lr of leaveRequests) {
      const start = lr.startDate > monthStart ? lr.startDate : monthStart;
      const end = lr.endDate < monthEnd ? lr.endDate : monthEnd;
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        leaveDays.set(d.toISOString().slice(0, 10), lr.type);
      }
    }

    // Get all timesheet entries for the month
    const entries = await this.prisma.timesheetEntry.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        timesheetWeek: { personId },
      },
      select: { date: true, hours: true },
    });

    const hoursByDate = new Map<string, number>();
    for (const e of entries) {
      const key = e.date.toISOString().slice(0, 10);
      hoursByDate.set(key, (hoursByDate.get(key) ?? 0) + Number(e.hours));
    }

    // Get active assignments for suggestions
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        personId,
        status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        validFrom: { lte: monthEnd },
        OR: [{ validTo: null }, { validTo: { gte: monthStart } }],
      },
      select: {
        allocationPercent: true,
        project: { select: { id: true, projectCode: true, name: true } },
      },
    });

    // Detect gaps day by day
    const daysInMonth = monthEnd.getUTCDate();
    const gaps: TimeGap[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, month - 1, d));
      const dateStr = date.toISOString().slice(0, 10);
      const dayOfWeek = date.getUTCDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const isHoliday = holidays.has(dateStr);
      const leaveType = leaveDays.get(dateStr) ?? null;
      const isLeave = leaveType !== null;

      // Holidays and leave days are not gaps
      if (isHoliday || isLeave) continue;

      const reported = hoursByDate.get(dateStr) ?? 0;
      const gap = stdHoursPerDay - reported;

      if (gap <= 0) continue;

      // Build suggestions
      const suggestions: GapSuggestion[] = [];

      if (assignments.length > 0) {
        // Suggest proportional fill based on allocation
        for (const a of assignments) {
          const suggestedHours = Math.round((Number(a.allocationPercent) / 100) * stdHoursPerDay * 10) / 10;
          if (suggestedHours > 0) {
            suggestions.push({
              type: 'assignment',
              label: `${a.project.projectCode} — ${a.project.name}`,
              hours: suggestedHours,
              projectId: a.project.id,
              projectCode: a.project.projectCode,
            });
          }
        }
      }

      if (assignments.length === 0 || suggestions.length === 0) {
        // No assignments — suggest bench
        suggestions.push(
          { type: 'bench', label: 'Self-Education', hours: gap, benchCategory: 'BENCH-EDU' },
          { type: 'bench', label: 'Administrative', hours: gap, benchCategory: 'BENCH-ADM' },
        );
      }

      // Always offer "Mark as Leave"
      suggestions.push({ type: 'leave', label: 'Mark as Leave', hours: stdHoursPerDay });

      gaps.push({
        date: dateStr,
        dayOfWeek: DAY_NAMES[dayOfWeek],
        expectedHours: stdHoursPerDay,
        reportedHours: Math.round(reported * 10) / 10,
        gapHours: Math.round(gap * 10) / 10,
        isHoliday,
        isLeave,
        leaveType,
        suggestions,
      });
    }

    return gaps;
  }
}
