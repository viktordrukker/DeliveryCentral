import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  PersonProfileAssignmentItemDto,
  PersonProfileChainItemDto,
  PersonProfileDto,
  PersonProfileLeaveBalanceItemDto,
  PersonProfilePoolDto,
  PersonProfileSkillDto,
  PersonProfileTimesheetSummaryDto,
} from './contracts/person-profile.dto';

interface CallerContext {
  callerPersonId: string | undefined;
  callerRoles: readonly string[];
}

const COST_RATE_VISIBLE_ROLES = new Set([
  'hr_manager',
  'director',
  'admin',
]);

/**
 * FE-#262 — Person profile aggregator.
 *
 * Composes 7 parallel reads (person / assignments / timesheet roll-up /
 * leave balance / manager chain / skills / pools) into one payload for the
 * 360 view at /people/:id.
 *
 * Cost-rate redaction: the `costRate` field is OMITTED (not nullified) when
 * the caller is neither the subject nor a member of HR_GOVERNANCE_ROLES /
 * EXEC_ROLES. Test #262 specifically asserts the field is absent for the
 * employee role.
 */
@Injectable()
export class PersonProfileService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getProfile(
    personId: string,
    caller: CallerContext,
  ): Promise<PersonProfileDto> {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: {
        id: true,
        displayName: true,
        givenName: true,
        familyName: true,
        primaryEmail: true,
        role: true,
        grade: true,
        location: true,
        timezone: true,
        employmentStatus: true,
        hiredAt: true,
      },
    });
    if (!person) throw new NotFoundException(`Person ${personId} not found.`);

    const [assignments, costRateRow, timesheet, leaveBalance, managerChain, skills, pools] =
      await Promise.all([
        this.loadAssignments(personId),
        this.loadCostRate(personId),
        this.loadTimesheetSummary(personId),
        this.loadLeaveBalance(personId),
        this.loadManagerChain(personId),
        this.loadSkills(personId),
        this.loadPools(personId),
      ]);

    const canSeeCost =
      caller.callerPersonId === personId ||
      caller.callerRoles.some((r) => COST_RATE_VISIBLE_ROLES.has(r));

    const payload: PersonProfileDto = {
      person: {
        ...person,
        hiredAt: person.hiredAt ? person.hiredAt.toISOString() : null,
      },
      assignments,
      timesheetSummary: timesheet,
      leaveBalance,
      managerChain,
      skills,
      pools,
    };
    if (canSeeCost && costRateRow !== null) {
      payload.costRate = costRateRow;
    }
    return payload;
  }

  private async loadAssignments(personId: string): Promise<PersonProfileAssignmentItemDto[]> {
    // SoT PR 14b — re-point onto ProjectPosition (canonical staffing aggregate).
    // The person-profile "assignments" list now shows the lean equivalent: the
    // person's active and historical position-fills. We filter on
    // `activePersonId` and pull only positions that ever carried this person
    // in their active-fill slot. Positions where this person is no longer the
    // active fill but were once held (RELEASED with the same activePersonId)
    // are still surfaced — the timeline ordering follows `activeValidFrom`.
    const rows = await this.prisma.projectPosition.findMany({
      where: { activePersonId: personId },
      select: {
        id: true,
        projectId: true,
        role: true,
        fillStatus: true,
        activeAllocationPercent: true,
        activeValidFrom: true,
        activeValidTo: true,
        project: { select: { name: true } },
      },
      orderBy: { activeValidFrom: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      projectName: r.project.name,
      staffingRole: r.role,
      status: r.fillStatus,
      allocationPercent: r.activeAllocationPercent === null ? 0 : Number(r.activeAllocationPercent),
      validFrom: r.activeValidFrom ? r.activeValidFrom.toISOString().slice(0, 10) : '',
      validTo: r.activeValidTo ? r.activeValidTo.toISOString().slice(0, 10) : null,
    }));
  }

  private async loadCostRate(personId: string): Promise<number | null> {
    const row = await this.prisma.personCostRate.findFirst({
      where: { personId, effectiveFrom: { lte: new Date() } },
      orderBy: { effectiveFrom: 'desc' },
      select: { hourlyRate: true },
    });
    return row === null ? null : Number(row.hourlyRate);
  }

  private async loadTimesheetSummary(
    personId: string,
  ): Promise<PersonProfileTimesheetSummaryDto> {
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

    const [weekRows, leaveSummary] = await Promise.all([
      this.prisma.timesheetWeek.findMany({
        where: {
          personId,
          weekStart: { gte: fourWeeksAgo },
          status: 'APPROVED',
        },
        select: {
          totalHours: true,
          standardHours: true,
          overtimeHours: true,
        },
        take: 8,
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          personId,
          status: 'APPROVED',
          startDate: { gte: fourWeeksAgo },
        },
        select: { startDate: true, endDate: true },
        take: 20,
      }),
    ]);

    let last4WeeksHours = 0;
    let overtimeHours = 0;
    for (const w of weekRows) {
      last4WeeksHours += w.totalHours === null ? 0 : Number(w.totalHours);
      overtimeHours += w.overtimeHours === null ? 0 : Number(w.overtimeHours);
    }
    // Leave hours approximation: count weekdays × 8h per request inside window.
    let leaveHours = 0;
    for (const l of leaveSummary) {
      leaveHours += countWeekdays(l.startDate, l.endDate) * 8;
    }
    return {
      last4WeeksHours: round1(last4WeeksHours),
      leaveHours: round1(leaveHours),
      overtimeHours: round1(overtimeHours),
    };
  }

  private async loadLeaveBalance(
    personId: string,
  ): Promise<PersonProfileLeaveBalanceItemDto[]> {
    const rows = await this.prisma.leaveBalance.findMany({
      where: { personId, year: new Date().getUTCFullYear() },
      select: {
        leaveType: true,
        entitlement: true,
        used: true,
        pending: true,
      },
    });
    return rows.map((r) => {
      const entitlement = Number(r.entitlement);
      const used = Number(r.used);
      const pending = Number(r.pending);
      return {
        type: r.leaveType,
        entitlement,
        used,
        pending,
        remaining: round1(entitlement - used - pending),
      };
    });
  }

  private async loadManagerChain(personId: string): Promise<PersonProfileChainItemDto[]> {
    const chain: PersonProfileChainItemDto[] = [];
    let current = personId;
    // Walk primary reporting lines upward, max 6 hops.
    for (let i = 0; i < 6; i += 1) {
      const line = await this.prisma.reportingLine.findFirst({
        where: { subjectPersonId: current, isPrimary: true, archivedAt: null },
        select: {
          relationshipType: true,
          manager: { select: { id: true, displayName: true } },
        },
      });
      if (!line) break;
      chain.push({
        personId: line.manager.id,
        displayName: line.manager.displayName,
        relationshipType: line.relationshipType,
      });
      current = line.manager.id;
    }
    return chain;
  }

  private async loadSkills(personId: string): Promise<PersonProfileSkillDto[]> {
    const rows = await this.prisma.personSkill.findMany({
      where: { personId },
      select: {
        skillId: true,
        proficiency: true,
        certified: true,
        skill: { select: { name: true } },
      },
      take: 100,
    });
    return rows.map((r) => ({
      skillId: r.skillId,
      skillName: r.skill.name,
      proficiency: r.proficiency,
      certified: r.certified,
    }));
  }

  private async loadPools(personId: string): Promise<PersonProfilePoolDto[]> {
    const now = new Date();
    const rows = await this.prisma.personResourcePoolMembership.findMany({
      where: { personId, archivedAt: null },
      include: { resourcePool: { select: { id: true, name: true } } },
    });
    // Membership is currently primary if its validity window covers today.
    return rows.map((r) => ({
      resourcePoolId: r.resourcePool.id,
      resourcePoolName: r.resourcePool.name,
      isPrimary: r.validFrom <= now && (r.validTo === null || r.validTo >= now),
    }));
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function countWeekdays(from: Date, to: Date): number {
  let count = 0;
  const d = new Date(from);
  while (d <= to) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}
