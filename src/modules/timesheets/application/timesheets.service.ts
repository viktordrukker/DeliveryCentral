import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

import { TimesheetRepository } from '../infrastructure/timesheet.repository';
import {
  RejectTimesheetDto,
  TimeReportData,
  TimesheetEntryDto,
  TimesheetWeekDto,
  UpsertEntryDto,
} from './contracts/timesheet.dto';

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseWeekStart(weekStart: string): Date {
  const d = new Date(weekStart);
  if (isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid weekStart date: ${weekStart}`);
  }
  return d;
}

@Injectable()
export class TimesheetsService {
  public constructor(
    private readonly repo: TimesheetRepository,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  public async getMyWeek(personId: string, weekStart: string): Promise<TimesheetWeekDto> {
    const weekDate = parseWeekStart(weekStart);
    let week = await this.repo.findWeekWithEntries(personId, weekDate);

    if (!week) {
      week = await this.repo.createWeek(personId, weekDate);
    }

    return this.mapWeek(week);
  }

  public async upsertEntry(
    personId: string,
    dto: UpsertEntryDto,
  ): Promise<TimesheetEntryDto> {
    const weekDate = parseWeekStart(dto.weekStart);
    let week = await this.repo.findWeekWithEntries(personId, weekDate);

    if (!week) {
      week = await this.repo.createWeek(personId, weekDate);
    }

    if (week.status === 'APPROVED') {
      throw new BadRequestException('Cannot edit an approved timesheet.');
    }

    if (week.status === 'SUBMITTED') {
      throw new BadRequestException('Cannot edit a submitted timesheet. Reject it first.');
    }

    const entryDate = new Date(dto.date);

    // 8-1-04: Check period lock
    const locks = await this.repo.findLocksForDate(entryDate);

    if (locks.length > 0) {
      throw new BadRequestException('This period is locked and cannot be edited.');
    }

    const entry = await this.repo.upsertEntry(
      week.id,
      dto.projectId,
      entryDate,
      new Prisma.Decimal(dto.hours),
      dto.capex ?? false,
      dto.description,
    );

    return {
      id: entry.id,
      projectId: entry.projectId,
      assignmentId: entry.assignmentId ?? undefined,
      date: toDateStr(entry.date),
      hours: Number(entry.hours),
      capex: entry.capex,
      description: entry.description ?? undefined,
    };
  }

  public async submitWeek(personId: string, weekStart: string): Promise<TimesheetWeekDto> {
    const weekDate = parseWeekStart(weekStart);
    const week = await this.repo.findWeekWithEntries(personId, weekDate);

    if (!week) {
      throw new NotFoundException('Timesheet week not found.');
    }

    if (week.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot submit a timesheet with status ${week.status}.`,
      );
    }

    const updated = await this.repo.updateWeek(week.id, {
      status: 'SUBMITTED',
      submittedAt: new Date(),
    });

    return this.mapWeek(updated);
  }

  public async getApprovalQueue(query: {
    status?: string;
    personId?: string;
    from?: string;
    to?: string;
  }): Promise<TimesheetWeekDto[]> {
    const weeks = await this.repo.findApprovalQueue(query);
    return weeks.map((w) => this.mapWeek(w));
  }

  public async approveWeek(weekId: string, approverId: string): Promise<TimesheetWeekDto> {
    const week = await this.repo.findWeekById(weekId);

    if (!week) {
      throw new NotFoundException('Timesheet week not found.');
    }

    if (week.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Cannot approve a timesheet with status ${week.status}.`,
      );
    }

    const updated = await this.repo.updateWeek(week.id, {
      status: 'APPROVED',
      approvedBy: approverId,
      approvedAt: new Date(),
    });

    void this.notificationEventTranslator?.timesheetApproved({
      weekId: week.id,
      weekStart: toDateStr(week.weekStart),
      personId: week.personId,
    });

    return this.mapWeek(updated);
  }

  public async rejectWeek(weekId: string, dto: RejectTimesheetDto): Promise<TimesheetWeekDto> {
    const week = await this.repo.findWeekById(weekId);

    if (!week) {
      throw new NotFoundException('Timesheet week not found.');
    }

    if (week.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Cannot reject a timesheet with status ${week.status}.`,
      );
    }

    const updated = await this.repo.updateWeek(week.id, {
      status: 'REJECTED',
      rejectedReason: dto.reason,
    });

    void this.notificationEventTranslator?.timesheetRejected({
      weekId: week.id,
      weekStart: toDateStr(week.weekStart),
      personId: week.personId,
      reason: dto.reason,
    });

    return this.mapWeek(updated);
  }

  public async getMyHistory(
    personId: string,
    from?: string,
    to?: string,
  ): Promise<TimesheetWeekDto[]> {
    const weeks = await this.repo.findHistory(personId, from, to);
    return weeks.map((w) => this.mapWeek(w));
  }

  public async getTimeReport(query: {
    from?: string;
    to?: string;
    projectId?: string;
    personId?: string;
  }): Promise<TimeReportData> {
    const entries = await this.repo.findApprovedEntries(
      query.from,
      query.to,
      query.projectId,
      query.personId,
    );

    const byProjectMap = new Map<string, number>();
    const byPersonMap = new Map<string, number>();
    const byDayMap = new Map<string, number>();
    let capexHours = 0;
    let opexHours = 0;

    for (const entry of entries) {
      const hrs = Number(entry.hours);
      const dateStr = toDateStr(entry.date);
      const personId = entry.timesheetWeek.personId;

      byProjectMap.set(entry.projectId, (byProjectMap.get(entry.projectId) ?? 0) + hrs);
      byPersonMap.set(personId, (byPersonMap.get(personId) ?? 0) + hrs);
      byDayMap.set(dateStr, (byDayMap.get(dateStr) ?? 0) + hrs);

      if (entry.capex) {
        capexHours += hrs;
      } else {
        opexHours += hrs;
      }
    }

    return {
      byProject: Array.from(byProjectMap.entries()).map(([name, hours]) => ({ name, hours })),
      byPerson: Array.from(byPersonMap.entries()).map(([name, hours]) => ({ name, hours })),
      byDay: Array.from(byDayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, hours]) => ({ date, hours })),
      capexHours,
      opexHours,
    };
  }

  private mapWeek(
    week: {
      id: string;
      personId: string;
      weekStart: Date;
      status: string;
      submittedAt: Date | null;
      approvedBy: string | null;
      approvedAt: Date | null;
      rejectedReason: string | null;
      entries: Array<{
        id: string;
        projectId: string;
        assignmentId: string | null;
        date: Date;
        hours: Prisma.Decimal;
        capex: boolean;
        description: string | null;
      }>;
    },
  ): TimesheetWeekDto {
    return {
      id: week.id,
      personId: week.personId,
      weekStart: toDateStr(week.weekStart),
      status: week.status as TimesheetWeekDto['status'],
      submittedAt: week.submittedAt ? week.submittedAt.toISOString() : undefined,
      approvedBy: week.approvedBy ?? undefined,
      approvedAt: week.approvedAt ? week.approvedAt.toISOString() : undefined,
      rejectedReason: week.rejectedReason ?? undefined,
      entries: week.entries.map((e) => ({
        id: e.id,
        projectId: e.projectId,
        assignmentId: e.assignmentId ?? undefined,
        date: toDateStr(e.date),
        hours: Number(e.hours),
        capex: e.capex,
        description: e.description ?? undefined,
      })),
    };
  }
}
