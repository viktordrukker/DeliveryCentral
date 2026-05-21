import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { PendingActionItemDto, PendingActionsResponseDto } from './contracts/pending-actions.dto';

const MAX_ITEMS = 10;
const HOUR_MS = 60 * 60 * 1000;

function severity(ageHours: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (ageHours >= 72) return 'HIGH';
  if (ageHours >= 24) return 'MEDIUM';
  return 'LOW';
}

// F-55 / 20c-11 — dropped the `PrismaQueryShape` hand-rolled gateway
// interface and its `as unknown as PrismaQueryShape` coercion. Each
// `p.X.findMany(...)` call now reads `this.prisma.X.findMany(...)` and
// inherits the typed return shape Prisma generates from the `select`
// clauses directly.
@Injectable()
export class PendingActionsQueryService {
  public constructor(private readonly prisma: PrismaService) {}

  public async execute(personId: string): Promise<PendingActionsResponseDto> {
    const now = Date.now();

    const reportingLines = await this.prisma.reportingLine.findMany({
      where: { managerPersonId: personId, archivedAt: null, validTo: null },
      select: { subjectPersonId: true },
    });
    const reportPersonIds = reportingLines.map((r) => r.subjectPersonId);

    const [staffingRows, budgetRows, leaveRows, timesheetRows] = await Promise.all([
      this.prisma.staffingRequest.findMany({
        where: { requestedByPersonId: personId, status: { in: ['OPEN', 'IN_REVIEW'] } },
        orderBy: { createdAt: 'asc' },
        take: MAX_ITEMS,
        select: { id: true, publicId: true, role: true, projectId: true, createdAt: true },
      }),
      this.prisma.budgetApproval.findMany({
        where: { status: 'PENDING' },
        orderBy: { requestedAt: 'asc' },
        take: MAX_ITEMS * 3,
        select: {
          id: true,
          requestedAt: true,
          projectBudget: { select: { projectId: true, fiscalYear: true } },
        },
      }),
      reportPersonIds.length === 0
        ? Promise.resolve([] as never[])
        : this.prisma.leaveRequest.findMany({
            where: { personId: { in: reportPersonIds }, status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            take: MAX_ITEMS,
            select: {
              id: true,
              publicId: true,
              createdAt: true,
              type: true,
              startDate: true,
              endDate: true,
              personId: true,
            },
          }),
      reportPersonIds.length === 0
        ? Promise.resolve([] as never[])
        : this.prisma.timesheetWeek.findMany({
            where: { personId: { in: reportPersonIds }, status: 'SUBMITTED' },
            orderBy: { submittedAt: 'asc' },
            take: MAX_ITEMS,
            select: {
              id: true,
              publicId: true,
              weekStart: true,
              submittedAt: true,
              personId: true,
            },
          }),
    ]);

    // Batch-load referenced projects + persons in one query each.
    const projectIds = new Set<string>();
    for (const sr of staffingRows) projectIds.add(sr.projectId);
    for (const ba of budgetRows) projectIds.add(ba.projectBudget.projectId);

    const personIds = new Set<string>();
    for (const lr of leaveRows) personIds.add(lr.personId);
    for (const ts of timesheetRows) personIds.add(ts.personId);

    const [projects, persons] = await Promise.all([
      projectIds.size === 0
        ? Promise.resolve([] as never[])
        : this.prisma.project.findMany({
            where: { id: { in: Array.from(projectIds) } },
            select: { id: true, projectCode: true, name: true },
          }),
      personIds.size === 0
        ? Promise.resolve([] as never[])
        : this.prisma.person.findMany({
            where: { id: { in: Array.from(personIds) } },
            select: { id: true, displayName: true },
          }),
    ]);
    const projectsById = new Map(projects.map((pr) => [pr.id, pr]));
    const personsById = new Map(persons.map((pe) => [pe.id, pe]));

    // Filter budget approvals to projects the principal is PM or DM of.
    const ownedProjectIds = new Set<string>();
    if (projects.length > 0) {
      const ownedRows = await this.prisma.project.findMany({
        where: {
          id: { in: projects.map((pr) => pr.id) },
          OR: [{ projectManagerId: personId }, { deliveryManagerId: personId }],
        },
        select: { id: true },
      });
      for (const owned of ownedRows) ownedProjectIds.add(owned.id);
    }

    const items: PendingActionItemDto[] = [];

    for (const sr of staffingRows) {
      const proj = projectsById.get(sr.projectId);
      const ageHours = (now - sr.createdAt.getTime()) / HOUR_MS;
      items.push({
        kind: 'STAFFING_REQUEST',
        id: sr.id,
        publicId: sr.publicId,
        title: `${sr.role}${proj ? ` — ${proj.name}` : ''}`,
        contextLabel: proj?.projectCode ?? null,
        ageHours,
        severity: severity(ageHours),
        ctaUrl: `/staffing-requests/${sr.publicId ?? sr.id}`,
      });
    }

    for (const ba of budgetRows) {
      if (!ownedProjectIds.has(ba.projectBudget.projectId)) continue;
      const proj = projectsById.get(ba.projectBudget.projectId);
      const ageHours = (now - ba.requestedAt.getTime()) / HOUR_MS;
      items.push({
        kind: 'BUDGET_CHANGE',
        id: ba.id,
        publicId: null,
        title: `Budget change${proj ? ` — ${proj.name}` : ''}`,
        contextLabel: proj
          ? `${proj.projectCode} · FY${ba.projectBudget.fiscalYear}`
          : `FY${ba.projectBudget.fiscalYear}`,
        ageHours,
        severity: severity(ageHours),
        ctaUrl: proj ? `/projects/${proj.id}?tab=budget` : `/projects`,
      });
    }

    for (const lr of leaveRows) {
      const person = personsById.get(lr.personId);
      const ageHours = (now - lr.createdAt.getTime()) / HOUR_MS;
      items.push({
        kind: 'LEAVE_REQUEST',
        id: lr.id,
        publicId: lr.publicId,
        title: `${person?.displayName ?? 'Employee'} — ${lr.type}`,
        contextLabel: `${lr.startDate.toISOString().slice(0, 10)} → ${lr.endDate.toISOString().slice(0, 10)}`,
        ageHours,
        severity: severity(ageHours),
        ctaUrl: `/leave-requests`,
      });
    }

    for (const ts of timesheetRows) {
      const person = personsById.get(ts.personId);
      const baseline = ts.submittedAt ?? ts.weekStart;
      const ageHours = (now - baseline.getTime()) / HOUR_MS;
      items.push({
        kind: 'TIMESHEET',
        id: ts.id,
        publicId: ts.publicId,
        title: `${person?.displayName ?? 'Employee'} — Timesheet`,
        contextLabel: `Week of ${ts.weekStart.toISOString().slice(0, 10)}`,
        ageHours,
        severity: severity(ageHours),
        ctaUrl: `/time-management`,
      });
    }

    items.sort((a, b) => b.ageHours - a.ageHours);
    const top = items.slice(0, MAX_ITEMS);

    return { items: top, totalCount: items.length };
  }
}
