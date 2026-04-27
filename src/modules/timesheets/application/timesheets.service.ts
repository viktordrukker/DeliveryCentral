import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

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
    private readonly prisma: PrismaService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  /**
   * AUTHZ-02: Verify the approver is in the line-management chain of the timesheet owner.
   * director/admin/hr_manager bypass the chain check (cross-org approvers by policy).
   * Walks the SOLID_LINE reporting graph upward from the owner up to a depth limit.
   */
  private async isApproverInManagerChain(
    ownerPersonId: string,
    approverPersonId: string,
    approverRoles: string[],
  ): Promise<boolean> {
    if (
      approverRoles.includes('admin') ||
      approverRoles.includes('director') ||
      approverRoles.includes('hr_manager')
    ) {
      return true;
    }

    const MAX_DEPTH = 8;
    let cursor: string | null = ownerPersonId;
    const visited = new Set<string>();
    for (let i = 0; i < MAX_DEPTH && cursor; i++) {
      if (visited.has(cursor)) break;
      visited.add(cursor);
      const line: { managerPersonId: string } | null = await this.prisma.reportingLine.findFirst({
        where: { subjectPersonId: cursor, relationshipType: 'SOLID_LINE', validTo: null },
        select: { managerPersonId: true },
      });
      if (!line) return false;
      if (line.managerPersonId === approverPersonId) return true;
      cursor = line.managerPersonId;
    }
    return false;
  }

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

    // Compute overtime fields
    const totalHours = week.entries.reduce((sum, e) => sum + Number(e.hours), 0);
    const standardThreshold = 40; // will be overridden by platform settings if available
    const standardHours = Math.min(totalHours, standardThreshold);
    const overtimeHours = Math.max(0, totalHours - standardThreshold);

    const updated = await this.repo.updateWeek(week.id, {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      totalHours: new Prisma.Decimal(totalHours.toFixed(2)),
      standardHours: new Prisma.Decimal(standardHours.toFixed(2)),
      overtimeHours: new Prisma.Decimal(overtimeHours.toFixed(2)),
      overtimeThreshold: standardThreshold,
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

  public async approveWeek(
    weekId: string,
    approverId: string,
    approverRoles: string[] = [],
  ): Promise<TimesheetWeekDto> {
    const week = await this.repo.findWeekById(weekId);

    if (!week) {
      throw new NotFoundException('Timesheet week not found.');
    }

    if (week.personId === approverId) {
      throw new BadRequestException('Cannot approve your own timesheet.');
    }

    if (week.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Cannot approve a timesheet with status ${week.status}.`,
      );
    }

    // AUTHZ-02: enforce manager-chain when approver is not director/admin/hr_manager.
    const allowed = await this.isApproverInManagerChain(week.personId, approverId, approverRoles);
    if (!allowed) {
      throw new ForbiddenException(
        'You are not in the management chain of this timesheet owner.',
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

    type Acc = { hours: number; standardHours: number; overtimeHours: number; benchHours: number };
    const byProjectMap = new Map<string, Acc>();
    const byPersonMap = new Map<string, Acc>();
    const byDayMap = new Map<string, number>();
    const weeklyMap = new Map<string, { standard: number; overtime: number; bench: number; leave: number }>();
    let capexHours = 0;
    let opexHours = 0;
    let totalBench = 0;

    // Group entries by person+week to compute OT per week
    const personWeekMap = new Map<string, { entries: Array<{ hours: number; isBench: boolean }>; weekStart: string }>();

    for (const entry of entries) {
      const hrs = Number(entry.hours);
      const dateStr = toDateStr(entry.date);
      const personId = entry.timesheetWeek.personId;
      const isBench = Boolean((entry as Record<string, unknown>).benchCategory);
      const weekStart = toDateStr(entry.timesheetWeek.weekStart ?? entry.date);

      // Day map
      byDayMap.set(dateStr, (byDayMap.get(dateStr) ?? 0) + hrs);

      // Capex/Opex
      if (entry.capex) capexHours += hrs;
      else opexHours += hrs;

      if (isBench) totalBench += hrs;

      // Person-week grouping for OT calculation
      const pwKey = `${personId}:${weekStart}`;
      const pw = personWeekMap.get(pwKey) ?? { entries: [], weekStart };
      pw.entries.push({ hours: hrs, isBench });
      personWeekMap.set(pwKey, pw);

      // Project accumulator
      const projAcc = byProjectMap.get(entry.projectId) ?? { hours: 0, standardHours: 0, overtimeHours: 0, benchHours: 0 };
      projAcc.hours += hrs;
      if (isBench) projAcc.benchHours += hrs;
      byProjectMap.set(entry.projectId, projAcc);

      // Person accumulator
      const personAcc = byPersonMap.get(personId) ?? { hours: 0, standardHours: 0, overtimeHours: 0, benchHours: 0 };
      personAcc.hours += hrs;
      if (isBench) personAcc.benchHours += hrs;
      byPersonMap.set(personId, personAcc);
    }

    // Compute OT per person-week, then distribute back
    let totalStandard = 0;
    let totalOT = 0;
    const STD_PER_WEEK = 40;

    for (const [pwKey, pw] of personWeekMap) {
      const personId = pwKey.split(':')[0];
      const weekTotal = pw.entries.reduce((s, e) => s + e.hours, 0);
      const ot = Math.max(0, weekTotal - STD_PER_WEEK);
      const std = weekTotal - ot;
      totalStandard += std;
      totalOT += ot;

      // Update person accumulator
      const personAcc = byPersonMap.get(personId)!;
      personAcc.standardHours += std;
      personAcc.overtimeHours += ot;

      // Weekly trend
      const wk = weeklyMap.get(pw.weekStart) ?? { standard: 0, overtime: 0, bench: 0, leave: 0 };
      wk.standard += std;
      wk.overtime += ot;
      wk.bench += pw.entries.filter((e) => e.isBench).reduce((s, e) => s + e.hours, 0);
      weeklyMap.set(pw.weekStart, wk);
    }

    // Project-level OT: proportional distribution
    for (const [, projAcc] of byProjectMap) {
      const total = capexHours + opexHours;
      if (total > 0) {
        projAcc.overtimeHours = Math.round((projAcc.hours / total) * totalOT * 100) / 100;
        projAcc.standardHours = projAcc.hours - projAcc.overtimeHours;
      } else {
        projAcc.standardHours = projAcc.hours;
      }
    }

    return {
      byProject: Array.from(byProjectMap.entries()).map(([name, acc]) => ({ name, ...acc })),
      byPerson: Array.from(byPersonMap.entries()).map(([name, acc]) => ({ name, ...acc })),
      byDay: Array.from(byDayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, hours]) => ({ date, hours })),
      weeklyTrend: Array.from(weeklyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, data]) => ({ week, ...data })),
      capexHours,
      opexHours,
      standardHours: Math.round(totalStandard * 100) / 100,
      overtimeHours: Math.round(totalOT * 100) / 100,
      benchHours: Math.round(totalBench * 100) / 100,
      leaveHours: 0, // leave hours computed separately from leave requests
      totalHours: Math.round((capexHours + opexHours) * 100) / 100,
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
      totalHours: Prisma.Decimal | null;
      standardHours: Prisma.Decimal | null;
      overtimeHours: Prisma.Decimal | null;
      overtimeApproved: boolean;
      overtimeThreshold: number | null;
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
      totalHours: week.totalHours ? Number(week.totalHours) : undefined,
      standardHours: week.standardHours ? Number(week.standardHours) : undefined,
      overtimeHours: week.overtimeHours ? Number(week.overtimeHours) : undefined,
      overtimeApproved: week.overtimeApproved || undefined,
      overtimeThreshold: week.overtimeThreshold ?? undefined,
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
