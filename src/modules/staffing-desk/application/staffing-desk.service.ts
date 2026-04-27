import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { StaffingDeskQueryDto } from './staffing-desk-query.dto';
import { StaffingDeskResponseDto, StaffingDeskKpis, SupplyDemandMetrics } from './staffing-desk-response.dto';
import { StaffingDeskRowDto, resolveStatusGroup } from './staffing-desk-row.dto';

// PERF-08 (partial): the staffing desk merges assignments + requests, applies cross-entity
// text filters, then sorts in memory. Switching to true DB-level pagination requires moving
// the merge into a UNION query so OFFSET/LIMIT can be applied to the unified set. Until then
// each side is capped at STAFFING_DESK_FETCH_LIMIT and a warning is logged when truncation
// is detected so operators know the result page may be incomplete.
const STAFFING_DESK_FETCH_LIMIT = 5000;

@Injectable()
export class StaffingDeskService {
  private readonly logger = new Logger(StaffingDeskService.name);
  public constructor(private readonly prisma: PrismaService) {}

  public async query(dto: StaffingDeskQueryDto): Promise<StaffingDeskResponseDto> {
    const kind = dto.kind || 'all';
    const statusList = dto.status ? dto.status.split(',').map((s) => s.trim().toUpperCase()) : [];
    const priorityList = dto.priority ? dto.priority.split(',').map((s) => s.trim().toUpperCase()) : [];
    const skillList = dto.skills ? dto.skills.split(',').map((s) => s.trim()) : [];
    const allocMin = dto.allocMin ? Number(dto.allocMin) : undefined;
    const allocMax = dto.allocMax ? Number(dto.allocMax) : undefined;
    const page = Math.max(1, dto.page ? Number(dto.page) : 1);
    const pageSize = Math.min(500, Math.max(1, dto.pageSize ? Number(dto.pageSize) : 50));
    const sortBy = dto.sortBy || 'createdAt';
    const sortDir = dto.sortDir === 'asc' ? 'asc' : 'desc';

    // Resolve person IDs filtered by pool or org unit
    const personScope = await this.resolvePersonScope(dto);

    // PERF-07: scope lookup tables to the IDs returned by the primary queries instead of
    // loading every person/project/skill/membership row in the database.
    const [assignmentRows, requestRows] = await Promise.all([
      kind !== 'request' ? this.fetchAssignments(dto, statusList, allocMin, allocMax, personScope) : Promise.resolve([]),
      kind !== 'assignment' ? this.fetchRequests(dto, statusList, priorityList, skillList, allocMin, allocMax) : Promise.resolve([]),
    ]);
    if (assignmentRows.length >= STAFFING_DESK_FETCH_LIMIT) {
      this.logger.warn(`Assignment fetch capped at ${STAFFING_DESK_FETCH_LIMIT}; results may be truncated. PERF-08 follow-up needed.`);
    }
    if (requestRows.length >= STAFFING_DESK_FETCH_LIMIT) {
      this.logger.warn(`Staffing-request fetch capped at ${STAFFING_DESK_FETCH_LIMIT}; results may be truncated. PERF-08 follow-up needed.`);
    }
    const personIdsForLookups = new Set<string>();
    for (const a of assignmentRows) personIdsForLookups.add(a.personId);
    for (const r of requestRows) personIdsForLookups.add(r.requestedByPersonId);
    const projectIdsForLookups = new Set<string>();
    for (const a of assignmentRows) projectIdsForLookups.add(a.projectId);
    for (const r of requestRows) projectIdsForLookups.add(r.projectId);

    // Batch-load ALL assignments for all unique person IDs (for inline timeline rendering).
    // Run before fetchLookups so timeline-referenced projects appear in projectsById.
    const uniquePersonIds = [...new Set(assignmentRows.map((a) => a.personId))];
    const allPersonAssignments = uniquePersonIds.length > 0
      ? await this.prisma.projectAssignment.findMany({
          where: { personId: { in: uniquePersonIds } },
          select: { personId: true, projectId: true, allocationPercent: true, validFrom: true, validTo: true, status: true },
        })
      : [];
    for (const pa of allPersonAssignments) projectIdsForLookups.add(pa.projectId);

    const lookups = await this.fetchLookups(
      [...personIdsForLookups],
      [...projectIdsForLookups],
    );

    const { peopleById, projectsById, skillsByPerson, poolByPerson, orgByPerson, managerByPerson } = lookups;
    const assignmentsByPerson = new Map<string, typeof allPersonAssignments>();
    for (const a of allPersonAssignments) {
      let arr = assignmentsByPerson.get(a.personId);
      if (!arr) { arr = []; assignmentsByPerson.set(a.personId, arr); }
      arr.push(a);
    }

    // Map assignments to unified rows
    const assignmentMapped: StaffingDeskRowDto[] = assignmentRows.map((a) => {
      const pm = peopleById.get(a.personId);
      return {
        id: a.id,
        kind: 'assignment' as const,
        projectId: a.projectId,
        projectName: projectsById.get(a.projectId) ?? a.projectId,
        role: a.staffingRole ?? '',
        allocationPercent: a.allocationPercent?.toNumber() ?? 0,
        startDate: a.validFrom.toISOString(),
        endDate: a.validTo?.toISOString() ?? null,
        status: a.status,
        statusGroup: resolveStatusGroup(a.status),
        createdAt: a.requestedAt?.toISOString() ?? a.validFrom.toISOString(),
        personId: a.personId,
        personName: pm?.displayName ?? a.personId,
        assignmentCode: a.assignmentCode,
        personAssignments: (assignmentsByPerson.get(a.personId) ?? []).map((pa) => ({
          allocationPercent: pa.allocationPercent?.toNumber() ?? 0,
          endDate: pa.validTo?.toISOString() ?? null,
          projectName: projectsById.get(pa.projectId) ?? pa.projectId,
          startDate: pa.validFrom.toISOString(),
          status: pa.status,
        })),
        personGrade: pm?.grade ?? null,
        personRole: pm?.role ?? null,
        personEmail: pm?.email ?? null,
        personOrgUnit: orgByPerson.get(a.personId) ?? null,
        personManager: managerByPerson.get(a.personId) ?? null,
        personPool: poolByPerson.get(a.personId) ?? null,
        personSkills: skillsByPerson.get(a.personId) ?? [],
        personEmploymentStatus: pm?.employmentStatus ?? null,
        priority: null,
        skills: [],
        headcountRequired: null,
        headcountFulfilled: null,
        requestedByName: null,
        summary: null,
      };
    });

    // Map requests to unified rows
    const requestMapped: StaffingDeskRowDto[] = requestRows.map((r) => ({
      id: r.id,
      kind: 'request' as const,
      projectId: r.projectId,
      projectName: projectsById.get(r.projectId) ?? r.projectId,
      role: r.role,
      allocationPercent: (r.allocationPercent as unknown as { toNumber(): number }).toNumber(),
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      status: r.status,
      statusGroup: resolveStatusGroup(r.status),
      createdAt: r.createdAt.toISOString(),
      personId: null,
      personName: null,
      assignmentCode: null,
      personAssignments: [],
      personGrade: null,
      personRole: null,
      personEmail: null,
      personOrgUnit: null,
      personManager: null,
      personPool: null,
      personSkills: [],
      personEmploymentStatus: null,
      priority: r.priority,
      skills: r.skills,
      headcountRequired: r.headcountRequired,
      headcountFulfilled: r.headcountFulfilled,
      requestedByName: peopleById.get(r.requestedByPersonId)?.displayName ?? r.requestedByPersonId,
      summary: r.summary,
    }));

    // Apply text filters (client-side for cross-entity matching)
    let merged = [...assignmentMapped, ...requestMapped];
    if (dto.person) {
      const term = dto.person.toLowerCase();
      merged = merged.filter(
        (r) =>
          (r.personName && r.personName.toLowerCase().includes(term)) ||
          (r.requestedByName && r.requestedByName.toLowerCase().includes(term)),
      );
    }
    if (dto.project) {
      const term = dto.project.toLowerCase();
      merged = merged.filter((r) => r.projectName.toLowerCase().includes(term));
    }

    // Sort
    merged.sort((a, b) => {
      const aVal = this.getSortValue(a, sortBy);
      const bVal = this.getSortValue(b, sortBy);
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    // KPIs from full merged set
    const kpis = this.computeKpis(merged);
    const supplyDemand = await this.computeSupplyDemand(dto, personScope);

    // Paginate
    const totalCount = merged.length;
    const items = merged.slice((page - 1) * pageSize, page * pageSize);

    return { items, page, pageSize, totalCount, kpis, supplyDemand };
  }

  private async fetchAssignments(
    dto: StaffingDeskQueryDto,
    statusList: string[],
    allocMin: number | undefined,
    allocMax: number | undefined,
    personScope: Set<string> | null,
  ) {
    // Legacy status vocabulary (DRAFT/REQUESTED/APPROVED/ACTIVE/ENDED/REVOKED) maps to the
    // current AssignmentStatus enum. Both sets are accepted for back-compat with existing
    // frontend links (/workload, /staffing-board) that still use the legacy names.
    const LEGACY_TO_ENUM: Record<string, string> = {
      DRAFT: 'CREATED',
      REQUESTED: 'PROPOSED',
      APPROVED: 'BOOKED',
      ACTIVE: 'ASSIGNED',
      ENDED: 'COMPLETED',
      REVOKED: 'CANCELLED',
      ARCHIVED: 'COMPLETED',
    };
    const VALID_ENUM = new Set([
      'CREATED', 'PROPOSED', 'REJECTED', 'BOOKED',
      'ONBOARDING', 'ASSIGNED', 'ON_HOLD', 'COMPLETED', 'CANCELLED',
    ]);
    const mapped = statusList
      .map((s) => LEGACY_TO_ENUM[s] ?? s)
      .filter((s) => VALID_ENUM.has(s));
    const assignmentStatuses = mapped.length ? mapped : undefined;

    const where: Record<string, unknown> = {};
    if (assignmentStatuses?.length) where.status = { in: assignmentStatuses };
    if (dto.projectId) where.projectId = dto.projectId;
    if (dto.personId) where.personId = dto.personId;
    if (personScope) where.personId = { in: [...personScope] };
    if (dto.from) where.validTo = { gte: new Date(dto.from) };
    if (dto.to) where.validFrom = { lte: new Date(dto.to) };
    if (allocMin !== undefined || allocMax !== undefined) {
      where.allocationPercent = {};
      if (allocMin !== undefined) (where.allocationPercent as Record<string, number>).gte = allocMin;
      if (allocMax !== undefined) (where.allocationPercent as Record<string, number>).lte = allocMax;
    }
    if (dto.role) where.staffingRole = { contains: dto.role, mode: 'insensitive' };

    return this.prisma.projectAssignment.findMany({
      where,
      select: {
        id: true,
        personId: true,
        projectId: true,
        staffingRole: true,
        status: true,
        allocationPercent: true,
        validFrom: true,
        validTo: true,
        requestedAt: true,
        assignmentCode: true,
      },
      orderBy: { validFrom: 'desc' },
      take: STAFFING_DESK_FETCH_LIMIT,
    });
  }

  private async fetchRequests(
    dto: StaffingDeskQueryDto,
    statusList: string[],
    priorityList: string[],
    skillList: string[],
    allocMin: number | undefined,
    allocMax: number | undefined,
  ) {
    const requestStatuses = statusList.length
      ? statusList.filter((s) => ['DRAFT', 'OPEN', 'IN_REVIEW', 'FULFILLED', 'CANCELLED'].includes(s))
      : undefined;

    const where: Record<string, unknown> = {};
    if (requestStatuses?.length) where.status = { in: requestStatuses };
    if (priorityList.length) where.priority = { in: priorityList };
    if (dto.projectId) where.projectId = dto.projectId;
    if (dto.from) where.endDate = { gte: new Date(dto.from) };
    if (dto.to) where.startDate = { lte: new Date(dto.to) };
    if (allocMin !== undefined || allocMax !== undefined) {
      where.allocationPercent = {};
      if (allocMin !== undefined) (where.allocationPercent as Record<string, number>).gte = allocMin;
      if (allocMax !== undefined) (where.allocationPercent as Record<string, number>).lte = allocMax;
    }
    if (dto.role) where.role = { contains: dto.role, mode: 'insensitive' };
    if (skillList.length) where.skills = { hasSome: skillList };

    return this.prisma.staffingRequest.findMany({
      where,
      select: {
        id: true,
        projectId: true,
        requestedByPersonId: true,
        role: true,
        skills: true,
        summary: true,
        allocationPercent: true,
        headcountRequired: true,
        headcountFulfilled: true,
        priority: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: STAFFING_DESK_FETCH_LIMIT,
    });
  }

  private async resolvePersonScope(dto: StaffingDeskQueryDto): Promise<Set<string> | null> {
    if (!dto.poolId && !dto.orgUnitId) return null;

    let poolPersonIds: string[] | null = null;
    let orgPersonIds: string[] | null = null;

    if (dto.poolId) {
      const memberships = await this.prisma.personResourcePoolMembership.findMany({
        where: { resourcePoolId: dto.poolId },
        select: { personId: true },
      });
      poolPersonIds = memberships.map((m: { personId: string }) => m.personId);
    }

    if (dto.orgUnitId) {
      const orgMembers = await this.prisma.personOrgMembership.findMany({
        where: { orgUnitId: dto.orgUnitId },
        select: { personId: true },
      });
      orgPersonIds = orgMembers.map((m: { personId: string }) => m.personId);
    }

    if (poolPersonIds && orgPersonIds) {
      const orgSet = new Set(orgPersonIds);
      return new Set(poolPersonIds.filter((id) => orgSet.has(id)));
    }

    return new Set(poolPersonIds ?? orgPersonIds ?? []);
  }

  private async fetchLookups(personIds: string[], projectIds: string[]) {
    // PERF-07: scope every lookup query to the IDs returned by the primary queries.
    // Without scoping, this loaded every Person, Project, PersonSkill, etc. row in the DB.
    const personFilter = personIds.length > 0 ? { id: { in: personIds } } : { id: { in: [] } };
    const projectFilter = projectIds.length > 0 ? { id: { in: projectIds } } : { id: { in: [] } };
    const personScopedFilter = personIds.length > 0 ? { personId: { in: personIds } } : { personId: { in: [] } };
    const subjectScopedFilter =
      personIds.length > 0 ? { subjectPersonId: { in: personIds } } : { subjectPersonId: { in: [] } };

    const [people, projects, personSkills, poolMemberships, orgMemberships, reportingLines] = await Promise.all([
      this.prisma.person.findMany({ where: personFilter, select: { id: true, displayName: true, grade: true, role: true, primaryEmail: true, employmentStatus: true } }),
      this.prisma.project.findMany({ where: projectFilter, select: { id: true, name: true } }),
      this.prisma.personSkill.findMany({ where: personScopedFilter, select: { personId: true, skill: { select: { name: true } } } }),
      this.prisma.personResourcePoolMembership.findMany({ where: personScopedFilter, select: { personId: true, resourcePool: { select: { name: true } } } }),
      this.prisma.personOrgMembership.findMany({ where: personScopedFilter, select: { personId: true, orgUnit: { select: { name: true } } } }),
      this.prisma.reportingLine.findMany({ where: { relationshipType: 'SOLID_LINE', ...subjectScopedFilter }, select: { subjectPersonId: true, manager: { select: { displayName: true } } } }),
    ]);

    const skillsByPerson = new Map<string, string[]>();
    for (const ps of personSkills) {
      const arr = skillsByPerson.get(ps.personId) ?? [];
      arr.push(ps.skill.name);
      skillsByPerson.set(ps.personId, arr);
    }

    const poolByPerson = new Map<string, string>();
    for (const pm of poolMemberships) {
      if (!poolByPerson.has(pm.personId)) poolByPerson.set(pm.personId, pm.resourcePool.name);
    }

    const orgByPerson = new Map<string, string>();
    for (const om of orgMemberships) {
      if (!orgByPerson.has(om.personId)) orgByPerson.set(om.personId, om.orgUnit.name);
    }

    const managerByPerson = new Map<string, string>();
    for (const rl of reportingLines) {
      if (!managerByPerson.has(rl.subjectPersonId)) managerByPerson.set(rl.subjectPersonId, rl.manager.displayName);
    }

    interface PersonMeta { displayName: string; grade: string | null; role: string | null; email: string | null; employmentStatus: string }
    const peopleById = new Map<string, PersonMeta>();
    for (const p of people) {
      peopleById.set(p.id, { displayName: p.displayName, grade: p.grade, role: p.role, email: p.primaryEmail, employmentStatus: p.employmentStatus });
    }

    return {
      peopleById,
      projectsById: new Map(projects.map((p) => [p.id, p.name])),
      skillsByPerson,
      poolByPerson,
      orgByPerson,
      managerByPerson,
    };
  }

  private getSortValue(row: StaffingDeskRowDto, sortBy: string): string | number {
    switch (sortBy) {
      case 'person': return row.personName ?? '';
      case 'project': return row.projectName;
      case 'status': return row.status;
      case 'allocation': return row.allocationPercent;
      case 'startDate': return row.startDate;
      case 'priority': return row.priority ?? '';
      case 'kind': return row.kind;
      default: return row.createdAt;
    }
  }

  private computeKpis(rows: StaffingDeskRowDto[]): StaffingDeskKpis {
    let activeAssignments = 0;
    let openRequests = 0;
    let totalAlloc = 0;
    let allocCount = 0;
    const personAllocations = new Map<string, number>();

    for (const row of rows) {
      if (row.kind === 'assignment' && (['BOOKED','ONBOARDING','ASSIGNED','ON_HOLD'].includes(row.status))) {
        activeAssignments++;
        if (row.personId) {
          personAllocations.set(row.personId, (personAllocations.get(row.personId) ?? 0) + row.allocationPercent);
        }
      }
      if (row.kind === 'request' && (row.status === 'OPEN' || row.status === 'IN_REVIEW')) {
        openRequests++;
      }
      if (row.kind === 'assignment') {
        totalAlloc += row.allocationPercent;
        allocCount++;
      }
    }

    let overallocatedPeople = 0;
    for (const total of personAllocations.values()) {
      if (total > 100) overallocatedPeople++;
    }

    return {
      activeAssignments,
      openRequests,
      avgAllocationPercent: allocCount > 0 ? Math.round(totalAlloc / allocCount) : 0,
      overallocatedPeople,
    };
  }

  private async computeSupplyDemand(
    dto: StaffingDeskQueryDto,
    personScope: Set<string> | null,
  ): Promise<SupplyDemandMetrics> {
    // Supply: people with active/approved assignments
    const activeAssignments = await this.prisma.projectAssignment.findMany({
      where: {
        status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        ...(personScope ? { personId: { in: [...personScope] } } : {}),
      },
      select: { personId: true, allocationPercent: true },
    });

    const personAlloc = new Map<string, number>();
    for (const a of activeAssignments) {
      personAlloc.set(a.personId, (personAlloc.get(a.personId) ?? 0) + (a.allocationPercent?.toNumber() ?? 0));
    }

    // All people in scope
    const allPeopleWhere: Record<string, unknown> = { employmentStatus: 'ACTIVE' };
    if (personScope) allPeopleWhere.id = { in: [...personScope] };
    const allPeople = await this.prisma.person.findMany({ where: allPeopleWhere, select: { id: true } });

    const totalPeople = allPeople.length;
    let availableFte = 0;
    let benchCount = 0;
    for (const p of allPeople) {
      const alloc = personAlloc.get(p.id) ?? 0;
      if (alloc < 100) availableFte++;
      if (alloc === 0) benchCount++;
    }

    // Demand: open/in-review requests
    const openWhere: Record<string, unknown> = { status: { in: ['OPEN', 'IN_REVIEW'] } };
    if (dto.projectId) openWhere.projectId = dto.projectId;
    const openRequests = await this.prisma.staffingRequest.findMany({
      where: openWhere,
      select: { headcountRequired: true, headcountFulfilled: true, createdAt: true },
    });

    let totalHcRequired = 0;
    let hcFulfilled = 0;
    for (const r of openRequests) {
      totalHcRequired += r.headcountRequired;
      hcFulfilled += r.headcountFulfilled;
    }
    const headcountOpen = totalHcRequired - hcFulfilled;

    // Fill rate from fulfilled requests
    const fulfilledRequests = await this.prisma.staffingRequest.findMany({
      where: { status: 'FULFILLED' },
      select: { headcountRequired: true, headcountFulfilled: true, createdAt: true, updatedAt: true },
    });
    let totalFulfilledHc = 0;
    let totalFulfilledRequired = 0;
    let totalDaysToFulfil = 0;
    for (const r of fulfilledRequests) {
      totalFulfilledHc += r.headcountFulfilled;
      totalFulfilledRequired += r.headcountRequired;
      totalDaysToFulfil += Math.max(0, (r.updatedAt.getTime() - r.createdAt.getTime()) / 86400000);
    }

    const allRequiredHc = totalFulfilledRequired + totalHcRequired;
    const allFulfilledHc = totalFulfilledHc + hcFulfilled;

    return {
      totalPeople,
      availableFte,
      benchCount,
      totalHeadcountRequired: totalHcRequired,
      headcountFulfilled: hcFulfilled,
      headcountOpen,
      gapHc: headcountOpen - availableFte,
      fillRatePercent: allRequiredHc > 0 ? Math.round((allFulfilledHc / allRequiredHc) * 100) : 100,
      avgDaysToFulfil: fulfilledRequests.length > 0 ? Math.round(totalDaysToFulfil / fulfilledRequests.length) : 0,
    };
  }
}
