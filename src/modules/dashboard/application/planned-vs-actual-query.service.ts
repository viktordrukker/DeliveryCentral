import { Injectable } from '@nestjs/common';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';

import {
  demoPeople,
  demoProjects,
} from '../../../../prisma/seeds/demo-dataset';
import { phase2People, phase2Projects } from '../../../../prisma/seeds/phase2-dataset';
import { lifeDemoPeople, lifeDemoProjects } from '../../../../prisma/seeds/life-demo-dataset';

const allPeopleById = new Map(
  [...demoPeople, ...phase2People, ...lifeDemoPeople].map((person) => [person.id, person]),
);
const allProjectsById = new Map(
  [...demoProjects, ...phase2Projects, ...lifeDemoProjects].map((project) => [project.id, project]),
);

interface PlannedVsActualQuery {
  asOf?: string;
  personId?: string;
  projectId?: string;
}

@Injectable()
export class PlannedVsActualQueryService {
  public constructor(
    private readonly projectAssignmentRepository: InMemoryProjectAssignmentRepository,
    private readonly workEvidenceRepository: InMemoryWorkEvidenceRepository,
  ) {}

  public async execute(query: PlannedVsActualQuery) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new Error('Planned vs actual asOf is invalid.');
    }

    const assignments = await this.projectAssignmentRepository.findAll();
    const workEvidence = await this.workEvidenceRepository.list({
      dateTo: asOf,
      ...(query.personId ? { personId: query.personId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
    });

    const filteredAssignments = assignments.filter((assignment) => {
      if (query.projectId && assignment.projectId !== query.projectId) {
        return false;
      }

      if (query.personId && assignment.personId !== query.personId) {
        return false;
      }

      return assignment.validFrom <= asOf;
    });

    const filteredEvidence = workEvidence.filter((item) => item.recordedAt <= asOf);

    const approvedOrActiveAssignments = filteredAssignments.filter((assignment) =>
      ['APPROVED', 'ACTIVE'].includes(assignment.status.value),
    );

    const assignedButNoEvidence = approvedOrActiveAssignments
      .filter(
        (assignment) =>
          !filteredEvidence.some(
            (item) => item.personId === assignment.personId && item.projectId === assignment.projectId,
          ),
      )
      .map((assignment) => ({
        allocationPercent: assignment.allocationPercent?.value ?? 0,
        assignmentId: assignment.assignmentId.value,
        person: this.toPersonSummary(assignment.personId),
        project: this.toProjectSummary(assignment.projectId),
        staffingRole: assignment.staffingRole,
      }));

    const evidenceButNoApprovedAssignment = filteredEvidence
      .filter(
        (item) =>
          !approvedOrActiveAssignments.some(
            (assignment) =>
              assignment.personId === item.personId && assignment.projectId === item.projectId,
          ),
      )
      .map((item) => ({
        activityDate: (item.occurredOn ?? item.recordedAt).toISOString(),
        effortHours: Number((((item.durationMinutes ?? 0) / 60)).toFixed(2)),
        person: this.toPersonSummary(item.personId ?? 'unattributed-person'),
        project: this.toProjectSummary(item.projectId ?? 'unattributed-project'),
        sourceType: item.evidenceType,
        workEvidenceId: item.workEvidenceId.value,
      }));

    const matchedRecords = filteredEvidence
      .map((item) => {
        const assignment = approvedOrActiveAssignments.find(
          (candidate) =>
            candidate.personId === item.personId && candidate.projectId === item.projectId,
        );

        if (!assignment) {
          return null;
        }

        return {
          allocationPercent: assignment.allocationPercent?.value ?? 0,
          assignmentId: assignment.assignmentId.value,
          effortHours: Number((((item.durationMinutes ?? 0) / 60)).toFixed(2)),
          person: this.toPersonSummary(item.personId ?? 'unattributed-person'),
          project: this.toProjectSummary(item.projectId ?? 'unattributed-project'),
          staffingRole: assignment.staffingRole,
          workEvidenceId: item.workEvidenceId.value,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const anomalies = [
      ...filteredEvidence
        .filter((item) => {
          const assignment = filteredAssignments.find(
            (candidate) =>
            candidate.personId === item.personId && candidate.projectId === item.projectId,
          );

          return Boolean(
            assignment && assignment.validTo && item.recordedAt > assignment.validTo,
          );
        })
        .map((item) => ({
          message: 'Observed work exists after the assignment end date.',
          person: this.toPersonSummary(item.personId ?? 'unattributed-person'),
          project: this.toProjectSummary(item.projectId ?? 'unattributed-project'),
          type: 'EVIDENCE_AFTER_ASSIGNMENT_END',
        })),
      ...evidenceButNoApprovedAssignment.map((item) => ({
        message: 'Observed work exists without an approved assignment match.',
        person: item.person,
        project: item.project,
        type: 'EVIDENCE_WITHOUT_APPROVED_ASSIGNMENT',
      })),
    ];

    return {
      anomalies,
      asOf: asOf.toISOString(),
      assignedButNoEvidence,
      evidenceButNoApprovedAssignment,
      matchedRecords,
    };
  }

  private toPersonSummary(personId: string) {
    const person = allPeopleById.get(personId);

    return {
      displayName: person?.displayName ?? personId,
      id: personId,
    };
  }

  private toProjectSummary(projectId: string) {
    const project = allProjectsById.get(projectId);

    return {
      id: projectId,
      name: project?.name ?? projectId,
      projectCode: project?.projectCode ?? 'UNKNOWN',
    };
  }
}
