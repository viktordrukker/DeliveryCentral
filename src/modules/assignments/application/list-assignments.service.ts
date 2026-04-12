import { Injectable } from '@nestjs/common';

import { demoPeople, demoProjects } from '../../../../prisma/seeds/demo-dataset';
import { lifeDemoPeople, lifeDemoProjects } from '../../../../prisma/seeds/life-demo-dataset';
import { phase2People, phase2Projects } from '../../../../prisma/seeds/phase2-dataset';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { AssignmentDirectoryItemDto } from './contracts/assignment-directory.dto';

// Merged lookup maps — covers demo, phase2, and life-demo seed datasets.
const allPeopleById = new Map(
  [...demoPeople, ...phase2People, ...lifeDemoPeople].map((person) => [person.id, person]),
);
const allProjectsById = new Map(
  [...demoProjects, ...phase2Projects, ...lifeDemoProjects].map((project) => [project.id, project]),
);

interface ListAssignmentsQuery {
  from?: string;
  personId?: string;
  page?: number;
  pageSize?: number;
  projectId?: string;
  status?: string;
  to?: string;
}

@Injectable()
export class ListAssignmentsService {
  public constructor(
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
  ) {}

  public async execute(query: ListAssignmentsQuery): Promise<{ items: AssignmentDirectoryItemDto[]; page: number; pageSize: number; totalCount: number }> {
    const normalizedStatus = query.status?.trim().toUpperCase();
    const assignments = await this.projectAssignmentRepository.findByQuery({
      personId: query.personId,
      projectId: query.projectId,
      statuses: normalizedStatus ? [normalizedStatus] : undefined,
    });

    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;

    const filtered = assignments.filter((assignment) => {
      if (fromDate && assignment.validTo && assignment.validTo < fromDate) {
        return false;
      }

      if (toDate && assignment.validFrom > toDate) {
        return false;
      }

      return true;
    });

    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(500, Math.max(1, query.pageSize ?? 100));
    const totalCount = filtered.length;
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const items = paginated.map<AssignmentDirectoryItemDto>((assignment) => {
      const person = allPeopleById.get(assignment.personId);
      const project = allProjectsById.get(assignment.projectId);

      return {
        allocationPercent: assignment.allocationPercent?.value ?? 0,
        approvalState: assignment.status.value,
        endDate: assignment.validTo?.toISOString() ?? null,
        id: assignment.assignmentId.value,
        person: {
          displayName: person?.displayName ?? assignment.personId,
          id: assignment.personId,
        },
        project: {
          displayName: project?.name ?? assignment.projectId,
          id: assignment.projectId,
        },
        staffingRole: assignment.staffingRole,
        startDate: assignment.validFrom.toISOString(),
        version: assignment.version,
      };
    });

    return { items, page, pageSize, totalCount };
  }
}
