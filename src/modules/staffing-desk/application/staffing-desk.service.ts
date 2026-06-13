import { Injectable, Logger } from '@nestjs/common';

import {
  IN_PROGRESS_DEMAND_FILL_STATUS,
  openDemandWhere,
} from '@src/shared/persistence/active-fill-window';
import {
  ACTIVE_FILL_STATUSES,
  canonicalActivePersonWhere,
  listBenchPersonIds,
} from '@src/shared/persistence/bench-query';
import { decimalToNumber } from '@src/shared/persistence/decimal';
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

    // SoT PR 14b — canonical read from ProjectPosition for inline timeline rendering.
    const uniquePersonIds = [...new Set(assignmentRows.map((a) => a.personId))];
    const allPersonPositions = uniquePersonIds.length > 0
      ? await this.prisma.projectPosition.findMany({
          where: { activePersonId: { in: uniquePersonIds } },
          select: {
            activePersonId: true, projectId: true, activeAllocationPercent: true,
            activeValidFrom: true, activeValidTo: true, fillStatus: true,
          },
        })
      : [];
    const allPersonAssignments = allPersonPositions
      .filter((p): p is typeof p & { activePersonId: string; activeValidFrom: Date } =>
        p.activePersonId !== null && p.activeValidFrom !== null,
      )
      .map((p) => ({
        personId: p.activePersonId,
        projectId: p.projectId,
        allocationPercent: p.activeAllocationPercent,
        validFrom: p.activeValidFrom,
        validTo: p.activeValidTo,
        status: p.fillStatus as string,
      }));
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

    // W1-11 — batch-resolve ProjectPosition.publicId for each desk row so the
    // frontend can deep-link via the opaque identifier. `legacyAssignmentId`
    // and `legacyStaffingRequestId` index columns on ProjectPosition map back
    // to the row.id used by this view.
    const assignmentIdSet = assignmentRows.map((a) => a.id);
    const requestIdSet = requestRows.map((r) => r.id);
    const positionPublicIdByAssignmentId = new Map<string, string | null>();
    const positionPublicIdByRequestId = new Map<string, string | null>();
    if (assignmentIdSet.length > 0 || requestIdSet.length > 0) {
      const positions = await this.prisma.projectPosition.findMany({
        where: {
          OR: [
            assignmentIdSet.length > 0 ? { legacyAssignmentId: { in: assignmentIdSet } } : null,
            requestIdSet.length > 0 ? { legacyStaffingRequestId: { in: requestIdSet } } : null,
          ].filter((c): c is NonNullable<typeof c> => c !== null),
        },
        select: { publicId: true, legacyAssignmentId: true, legacyStaffingRequestId: true },
      });
      for (const p of positions) {
        if (p.legacyAssignmentId) {
          positionPublicIdByAssignmentId.set(p.legacyAssignmentId, p.publicId ?? null);
        }
        if (p.legacyStaffingRequestId) {
          positionPublicIdByRequestId.set(p.legacyStaffingRequestId, p.publicId ?? null);
        }
      }
    }

    // Map assignments to unified rows
    const assignmentMapped: StaffingDeskRowDto[] = assignmentRows.map((a) => {
      const pm = peopleById.get(a.personId);
      return {
        id: a.id,
        positionPublicId: positionPublicIdByAssignmentId.get(a.id) ?? null,
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
      positionPublicId: positionPublicIdByRequestId.get(r.id) ?? null,
      kind: 'request' as const,
      projectId: r.projectId,
      projectName: projectsById.get(r.projectId) ?? r.projectId,
      role: r.role,
      allocationPercent: decimalToNumber(r.allocationPercent),
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
      'DRAFT', 'CREATED', 'PROPOSED', 'IN_REVIEW', 'REJECTED', 'BOOKED',
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

    // SoT PR 14b — canonical read from ProjectPosition (active-fill positions).
    // The where clause built above uses legacy field names (personId, status,
    // allocationPercent, validFrom, validTo, staffingRole). Translate to canonical.
    const canonicalWhere: Record<string, unknown> = {};
    canonicalWhere.activePersonId = { not: null };
    if ('status' in where) canonicalWhere.fillStatus = where.status;
    if ('projectId' in where) canonicalWhere.projectId = where.projectId;
    if ('personId' in where) canonicalWhere.activePersonId = where.personId;
    if ('validTo' in where) canonicalWhere.activeValidTo = where.validTo;
    if ('validFrom' in where) canonicalWhere.activeValidFrom = where.validFrom;
    if ('allocationPercent' in where) canonicalWhere.activeAllocationPercent = where.allocationPercent;
    if ('staffingRole' in where) canonicalWhere.role = where.staffingRole;

    const positions = await this.prisma.projectPosition.findMany({
      where: canonicalWhere,
      select: {
        id: true,
        activePersonId: true,
        projectId: true,
        role: true,
        fillStatus: true,
        activeAllocationPercent: true,
        activeValidFrom: true,
        activeValidTo: true,
        createdAt: true,
        legacyAssignmentId: true,
      },
      orderBy: { activeValidFrom: 'desc' },
      take: STAFFING_DESK_FETCH_LIMIT,
    });
    return positions
      .filter((p): p is typeof p & { activePersonId: string; activeValidFrom: Date } =>
        p.activePersonId !== null && p.activeValidFrom !== null,
      )
      .map((p) => ({
        // Surface ProjectPosition.id so downstream positionPublicId lookup can join on it;
        // legacyAssignmentId remains as historical join key.
        id: p.legacyAssignmentId ?? p.id,
        personId: p.activePersonId,
        projectId: p.projectId,
        staffingRole: p.role,
        status: p.fillStatus as string,
        allocationPercent: p.activeAllocationPercent,
        validFrom: p.activeValidFrom,
        validTo: p.activeValidTo,
        requestedAt: p.createdAt,
        assignmentCode: null as string | null,
      }));
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

    // SoT PR 14b — canonical read from ProjectPosition (open-demand positions).
    // Legacy StaffingRequest status values DRAFT/OPEN/IN_REVIEW/FULFILLED/CANCELLED
    // map to ProjectPosition.fillStatus values. FULFILLED ~ BOOKED, IN_REVIEW ~ PROPOSED.
    const LEGACY_TO_FILL: Record<string, string> = {
      DRAFT: 'DRAFT',
      OPEN: 'OPEN',
      IN_REVIEW: 'PROPOSED',
      FULFILLED: 'BOOKED',
      CANCELLED: 'RELEASED',
    };
    const canonicalWhere: Record<string, unknown> = {};
    if ('status' in where) {
      const statusFilter = where.status as { in?: string[] };
      if (statusFilter && Array.isArray(statusFilter.in)) {
        const mapped = statusFilter.in.map((s) => LEGACY_TO_FILL[s] ?? s);
        canonicalWhere.fillStatus = { in: mapped };
      }
    }
    if ('priority' in where) canonicalWhere.priority = where.priority;
    if ('projectId' in where) canonicalWhere.projectId = where.projectId;
    if ('endDate' in where) canonicalWhere.endDate = where.endDate;
    if ('startDate' in where) canonicalWhere.startDate = where.startDate;
    if ('allocationPercent' in where) canonicalWhere.requiredAllocationPercent = where.allocationPercent;
    if ('role' in where) canonicalWhere.role = where.role;
    if ('skills' in where) canonicalWhere.skills = where.skills;

    const positions = await this.prisma.projectPosition.findMany({
      where: canonicalWhere,
      select: {
        id: true,
        projectId: true,
        requestedByPersonId: true,
        role: true,
        skills: true,
        summary: true,
        requiredAllocationPercent: true,
        priority: true,
        fillStatus: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        legacyStaffingRequestId: true,
        activePersonId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: STAFFING_DESK_FETCH_LIMIT,
    });
    // Canonical model: 1 row = 1 headcount. Filled (BOOKED+activePersonId) =>
    // headcountFulfilled:1; else 0. Map back to legacy shape for downstream.
    const FILL_TO_LEGACY: Record<string, string> = {
      DRAFT: 'DRAFT',
      OPEN: 'OPEN',
      PROPOSED: 'IN_REVIEW',
      BOOKED: 'FULFILLED',
      ONBOARDING: 'FULFILLED',
      ASSIGNED: 'FULFILLED',
      ON_HOLD: 'FULFILLED',
      RELEASED: 'CANCELLED',
    };
    return positions.map((p) => ({
      // Use legacyStaffingRequestId when present so positionPublicId resolution joins;
      // otherwise the position.id itself flows through (post-cutover, only ID is the position).
      id: p.legacyStaffingRequestId ?? p.id,
      projectId: p.projectId,
      requestedByPersonId: p.requestedByPersonId ?? '',
      role: p.role,
      skills: p.skills,
      summary: p.summary,
      allocationPercent: p.requiredAllocationPercent,
      headcountRequired: 1,
      headcountFulfilled: p.activePersonId ? 1 : 0,
      priority: p.priority,
      status: FILL_TO_LEGACY[p.fillStatus] ?? p.fillStatus,
      startDate: p.startDate,
      endDate: p.endDate,
      createdAt: p.createdAt,
    }));
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
    // Supply: people with active fills on `now` (canonical ProjectPosition
    // aggregate, replacing the legacy ProjectAssignment read). Without this
    // shape the Staffing Desk and the Bench page disagreed on the bench
    // headcount even though they were looking at the same data.
    const now = new Date();
    const activeAssignments = await this.prisma.projectPosition.findMany({
      where: {
        fillStatus: { in: [...ACTIVE_FILL_STATUSES] },
        activePersonId: { not: null, ...(personScope ? { in: [...personScope] } : {}) },
        activeValidFrom: { lte: now },
        OR: [{ activeValidTo: null }, { activeValidTo: { gte: now } }],
      },
      select: { activePersonId: true, activeAllocationPercent: true },
    });

    const personAlloc = new Map<string, number>();
    for (const a of activeAssignments) {
      if (!a.activePersonId) continue;
      personAlloc.set(
        a.activePersonId,
        (personAlloc.get(a.activePersonId) ?? 0) + (a.activeAllocationPercent?.toNumber() ?? 0),
      );
    }

    // All people in scope — canonical active-employee predicate so the
    // headcount denominator matches the bench-set numerator.
    const allPeopleWhere: Record<string, unknown> = { ...canonicalActivePersonWhere() };
    if (personScope) allPeopleWhere.id = { in: [...personScope] };
    const allPeople = await this.prisma.person.findMany({ where: allPeopleWhere, select: { id: true } });

    // Bench: canonical bench set intersected with this view's scope.
    const canonicalBench = await listBenchPersonIds(this.prisma, now);
    const totalPeople = allPeople.length;
    let availableFte = 0;
    let benchCount = 0;
    for (const p of allPeople) {
      const alloc = personAlloc.get(p.id) ?? 0;
      if (alloc < 100) availableFte++;
      if (canonicalBench.has(p.id)) benchCount++;
    }

    // PR-16 (Decision E) — canonical demand read from ProjectPosition.
    // "open" = fillStatus OPEN; "in progress" = fillStatus PROPOSED. The desk
    // shows both, but the OPEN count agrees with the Director KPI and the
    // bench-matching pool. Demand headcount = OPEN + PROPOSED (one row == one
    // headcount); fulfilled within demand stays 0 (an OPEN/PROPOSED row has no
    // committed person against required headcount yet).
    const openWhere = openDemandWhere(dto.projectId ? { projectId: dto.projectId } : undefined);
    const inProgressWhere: Record<string, unknown> = { fillStatus: IN_PROGRESS_DEMAND_FILL_STATUS };
    if (dto.projectId) inProgressWhere.projectId = dto.projectId;
    const [headcountOpen, headcountInProgress] = await Promise.all([
      this.prisma.projectPosition.count({ where: openWhere }),
      this.prisma.projectPosition.count({ where: inProgressWhere }),
    ]);

    // Canonical model: 1 row = 1 headcount. OPEN + PROPOSED rows are demand.
    const totalHcRequired = headcountOpen + headcountInProgress;
    const hcFulfilled = 0;

    // Fill rate from booked positions (was: status=FULFILLED staffing requests).
    const fulfilledPositions = await this.prisma.projectPosition.findMany({
      where: { fillStatus: 'BOOKED', activePersonId: { not: null } },
      select: { createdAt: true, updatedAt: true },
    });
    let totalFulfilledHc = fulfilledPositions.length;
    let totalFulfilledRequired = fulfilledPositions.length;
    let totalDaysToFulfil = 0;
    for (const r of fulfilledPositions) {
      totalDaysToFulfil += Math.max(0, (r.updatedAt.getTime() - r.createdAt.getTime()) / 86400000);
    }
    // Keep variable name compatible with bottom-of-method math.
    const fulfilledRequests = fulfilledPositions;

    const allRequiredHc = totalFulfilledRequired + totalHcRequired;
    const allFulfilledHc = totalFulfilledHc + hcFulfilled;

    return {
      totalPeople,
      availableFte,
      benchCount,
      totalHeadcountRequired: totalHcRequired,
      headcountFulfilled: hcFulfilled,
      headcountOpen,
      headcountInProgress,
      gapHc: headcountOpen - availableFte,
      fillRatePercent: allRequiredHc > 0 ? Math.round((allFulfilledHc / allRequiredHc) * 100) : 100,
      avgDaysToFulfil: fulfilledRequests.length > 0 ? Math.round(totalDaysToFulfil / fulfilledRequests.length) : 0,
    };
  }
}
