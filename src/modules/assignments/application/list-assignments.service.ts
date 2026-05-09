import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { AssignmentDirectoryItemDto } from './contracts/assignment-directory.dto';

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
    private readonly prisma: PrismaService,
  ) {}

  public async execute(query: ListAssignmentsQuery): Promise<{ items: AssignmentDirectoryItemDto[]; page: number; pageSize: number; totalCount: number }> {
    const normalizedStatus = query.status?.trim().toUpperCase();
    // The frontend uses the virtual token `ACTIVE` to mean "currently
    // committed" (BOOKED + ONBOARDING + ASSIGNED + ON_HOLD) — there is no
    // `ACTIVE` value on the canonical AssignmentStatus enum (CSW workflow
    // uses ASSIGNED). Expand the token here so direct DB filtering passes
    // valid enum values, and a single literal status still works.
    const statuses = expandStatusFilter(normalizedStatus);
    const assignments = await this.projectAssignmentRepository.findByQuery({
      personId: query.personId,
      projectId: query.projectId,
      statuses,
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

    const [dbPeople, dbProjects] = await Promise.all([
      this.prisma.person.findMany({ select: { id: true, displayName: true } }),
      this.prisma.project.findMany({ select: { id: true, name: true } }),
    ]);
    const allPeopleById = new Map(dbPeople.map((p) => [p.id, p]));
    const allProjectsById = new Map(dbProjects.map((p) => [p.id, p]));

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
        slaStage: assignment.slaStage ?? null,
        slaDueAt: assignment.slaDueAt?.toISOString() ?? null,
        slaBreachedAt: assignment.slaBreachedAt?.toISOString() ?? null,
        requiresDirectorApproval: assignment.requiresDirectorApproval,
      };
    });

    return { items, page, pageSize, totalCount };
  }
}

/**
 * Expand a frontend-supplied status token to the set of canonical
 * AssignmentStatus enum values it covers. The literal token `ACTIVE` is a
 * virtual filter meaning "currently committed" (BOOKED + ONBOARDING +
 * ASSIGNED + ON_HOLD); other tokens pass through verbatim.
 */
function expandStatusFilter(token: string | undefined): string[] | undefined {
  if (!token) return undefined;
  if (token === 'ACTIVE') {
    return ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'];
  }
  return [token];
}

