import { Injectable } from '@nestjs/common';

import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { getCached, setCache } from '@src/shared/cache/simple-cache';

import {
  DashboardPersonSummaryDto,
  DashboardProjectSummaryDto,
  WorkloadDashboardSummaryDto,
} from './contracts/workload-dashboard.dto';

interface WorkloadDashboardQuery {
  asOf?: string;
}

@Injectable()
export class WorkloadDashboardQueryService {
  public constructor(
    private readonly personRepository: InMemoryPersonRepository,
    private readonly projectRepository: InMemoryProjectRepository,
    private readonly projectAssignmentRepository: InMemoryProjectAssignmentRepository,
    private readonly workEvidenceRepository: InMemoryWorkEvidenceRepository,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  public async execute(query: WorkloadDashboardQuery): Promise<WorkloadDashboardSummaryDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new Error('Dashboard asOf is invalid.');
    }

    // Round asOf to the minute for cache key stability
    const roundedMinute = new Date(asOf);
    roundedMinute.setSeconds(0, 0);
    const cacheKey = `workload-summary:${roundedMinute.toISOString()}`;

    const cached = getCached<WorkloadDashboardSummaryDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const settings = await this.platformSettingsService.getAll();
    const nearingClosureDays = settings.dashboard.nearingClosureDaysThreshold;

    const [allPeople, allProjects, allAssignments, recentEvidence] = await Promise.all([
      this.personRepository.listAll(),
      this.projectRepository.findAll(),
      this.projectAssignmentRepository.findAll(),
      this.workEvidenceRepository.list({ dateTo: asOf }),
    ]);

    const activeProjects = allProjects.filter((project) => {
      if (project.status !== 'ACTIVE') return false;
      if (project.startsOn && project.startsOn > asOf) return false;
      return true;
    });
    const activeProjectIds = new Set(activeProjects.map((project) => project.projectId.value));

    const activeAssignments = allAssignments.filter(
      (assignment) => activeProjectIds.has(assignment.projectId) && assignment.isActiveAt(asOf),
    );

    const activeAssignedPersonIds = new Set(activeAssignments.map((a) => a.personId));
    const activeAssignedProjectIds = new Set(activeAssignments.map((a) => a.projectId));

    const activePeople = allPeople.filter(
      (person) => person.status === 'ACTIVE' || (person.status as string) === 'LEAVE',
    );

    const peopleWithNoActiveAssignments = activePeople
      .filter((person) => !activeAssignedPersonIds.has(person.personId.value))
      .map<DashboardPersonSummaryDto>((person) => ({
        displayName: person.displayName,
        id: person.personId.value,
      }));

    const projectsWithNoStaff = activeProjects
      .filter((project) => !activeAssignedProjectIds.has(project.projectId.value))
      .map<DashboardProjectSummaryDto>((project) => ({
        id: project.projectId.value,
        name: project.name,
        projectCode: project.projectCode,
      }));

    // Evidence cutoff: configured threshold
    const evidenceCutoff = new Date(asOf);
    evidenceCutoff.setUTCDate(evidenceCutoff.getUTCDate() - nearingClosureDays);
    const recentEvidenceFiltered = recentEvidence.filter(
      (item) => (item.occurredOn ?? item.recordedAt) >= evidenceCutoff,
    );

    // Precompute assignment lookup for O(1) person:project membership checks
    const assignmentKeys = new Set(
      activeAssignments.map((a) => `${a.personId}:${a.projectId}`),
    );

    // Group recent evidence by project for O(1) per-project access
    const evidenceByProject = new Map<string, typeof recentEvidenceFiltered>();
    for (const ev of recentEvidenceFiltered) {
      if (!ev.projectId) continue;
      const arr = evidenceByProject.get(ev.projectId);
      if (arr) arr.push(ev);
      else evidenceByProject.set(ev.projectId, [ev]);
    }

    const projectsWithEvidenceButNoApprovedAssignment = activeProjects
      .filter((project) => {
        const evidenceForProject = evidenceByProject.get(project.projectId.value);
        if (!evidenceForProject || evidenceForProject.length === 0) return false;
        return evidenceForProject.some(
          (ev) => !assignmentKeys.has(`${ev.personId}:${ev.projectId ?? ''}`),
        );
      })
      .map<DashboardProjectSummaryDto>((project) => ({
        id: project.projectId.value,
        name: project.name,
        projectCode: project.projectCode,
      }));

    const result: WorkloadDashboardSummaryDto = {
      peopleWithNoActiveAssignments,
      peopleWithNoActiveAssignmentsCount: peopleWithNoActiveAssignments.length,
      projectsWithEvidenceButNoApprovedAssignment,
      projectsWithEvidenceButNoApprovedAssignmentCount:
        projectsWithEvidenceButNoApprovedAssignment.length,
      projectsWithNoStaff,
      projectsWithNoStaffCount: projectsWithNoStaff.length,
      totalActiveAssignments: activeAssignments.length,
      totalActiveProjects: activeProjects.length,
      unassignedActivePeopleCount: peopleWithNoActiveAssignments.length,
    };

    setCache(cacheKey, result, 60_000);

    return result;
  }
}
