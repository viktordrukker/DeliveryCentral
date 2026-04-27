import { BadRequestException, Injectable, Optional } from '@nestjs/common';

import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { AppConfig } from '@src/shared/config/app-config';

import { ExceptionResolutionStore } from '../domain/exception-resolution.store';
import {
  ExceptionQueueCategory,
  ExceptionQueueItemDto,
  ExceptionQueueResponseDto,
  ExceptionQueueStatus,
} from './contracts/exception-queue.dto';

interface ExceptionQueueQuery {
  asOf?: string;
  category?: ExceptionQueueCategory;
  limit?: number;
  provider?: 'm365' | 'radius';
  status?: ExceptionQueueStatus;
  targetEntityId?: string;
  targetEntityType?: string;
}

@Injectable()
export class ExceptionQueueQueryService {
  public constructor(
    private readonly projectAssignmentRepository: InMemoryProjectAssignmentRepository,
    private readonly projectRepository: InMemoryProjectRepository,
    private readonly appConfig: AppConfig,
    @Optional() private readonly resolutionStore: ExceptionResolutionStore | null = null,
  ) {}

  public async getQueue(query: ExceptionQueueQuery = {}): Promise<ExceptionQueueResponseDto> {
    const asOf = this.resolveAsOf(query.asOf);

    const [assignments, projects] = await Promise.all([
      this.projectAssignmentRepository.findAll(),
      this.projectRepository.findAll(),
    ]);

    const items = [
      ...(await this.buildProjectClosureConflicts(projects, assignments, asOf)),
      ...this.buildStaleApprovals(assignments, asOf),
    ];

    const statusFilter = query.status ?? 'OPEN';

    const enrichedItems: ExceptionQueueItemDto[] = items.map((item) => {
      if (this.resolutionStore !== null) {
        const resolution = this.resolutionStore.getById(item.id);
        if (resolution) {
          return { ...item, status: resolution.status };
        }
      }
      return item;
    });

    const filtered = enrichedItems
      .filter((item) => !query.category || item.category === query.category)
      .filter((item) => item.status === statusFilter)
      .filter((item) => !query.targetEntityType || item.targetEntityType === query.targetEntityType)
      .filter((item) => !query.targetEntityId || item.targetEntityId === query.targetEntityId)
      .sort((left, right) => right.observedAt.localeCompare(left.observedAt));

    const boundedLimit = Math.min(Math.max(query.limit ?? 100, 1), 250);
    const visibleItems = filtered.slice(0, boundedLimit);

    return {
      asOf: asOf.toISOString(),
      items: visibleItems,
      summary: {
        byCategory: visibleItems.reduce<Partial<Record<ExceptionQueueCategory, number>>>(
          (aggregate, item) => {
            aggregate[item.category] = (aggregate[item.category] ?? 0) + 1;
            return aggregate;
          },
          {},
        ),
        open: visibleItems.length,
        total: visibleItems.length,
      },
    };
  }

  public async getById(
    id: string,
    query: Omit<ExceptionQueueQuery, 'limit'> = {},
  ): Promise<ExceptionQueueItemDto | null> {
    const queue = await this.getQueue(query);
    return queue.items.find((item) => item.id === id) ?? null;
  }

  private resolveAsOf(value?: string): Date {
    const asOf = value ? new Date(value) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Exceptions asOf is invalid.');
    }

    return asOf;
  }

  private async buildProjectClosureConflicts(
    projects: Array<{ projectId: { value: string }; status: string; name: string }>,
    assignments: ProjectAssignment[],
    asOf: Date,
  ): Promise<ExceptionQueueItemDto[]> {
    const items: ExceptionQueueItemDto[] = [];

    for (const project of projects.filter((item) => item.status === 'CLOSED')) {
      const activeAssignments = assignments.filter(
        (assignment) => assignment.projectId === project.projectId.value && assignment.isActiveAt(asOf),
      );

      if (activeAssignments.length === 0) {
        continue;
      }

      items.push({
        category: 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS',
        details: {
          activeAssignmentCount: activeAssignments.length,
          activeAssignmentIds: activeAssignments.map((assignment) => assignment.assignmentId.value),
        },
        id: `project-closure-with-active-assignments:${project.projectId.value}`,
        observedAt: asOf.toISOString(),
        projectId: project.projectId.value,
        projectName: project.name,
        sourceContext: 'project',
        status: 'OPEN',
        summary: `Closed project ${project.name} still has ${activeAssignments.length} active assignment${activeAssignments.length === 1 ? '' : 's'}.`,
        targetEntityId: project.projectId.value,
        targetEntityType: 'PROJECT',
      });
    }

    return items;
  }

  private buildStaleApprovals(
    assignments: ProjectAssignment[],
    asOf: Date,
  ): ExceptionQueueItemDto[] {
    const thresholdMs = this.appConfig.exceptionsStaleApprovalDays * 24 * 60 * 60 * 1000;

    return assignments
      .filter((assignment) => assignment.status.value === 'PROPOSED')
      .filter((assignment) => asOf.getTime() - assignment.requestedAt.getTime() >= thresholdMs)
      .map((assignment) => ({
        assignmentId: assignment.assignmentId.value,
        category: 'STALE_ASSIGNMENT_APPROVAL',
        details: {
          requestedAt: assignment.requestedAt.toISOString(),
          staleDays: Math.floor((asOf.getTime() - assignment.requestedAt.getTime()) / (24 * 60 * 60 * 1000)),
        },
        id: `stale-assignment-approval:${assignment.assignmentId.value}`,
        observedAt: assignment.requestedAt.toISOString(),
        personDisplayName: undefined,
        personId: assignment.personId,
        projectId: assignment.projectId,
        projectName: undefined,
        sourceContext: 'assignment',
        status: 'OPEN',
        summary: `Assignment approval request has been stale since ${assignment.requestedAt.toISOString()}.`,
        targetEntityId: assignment.assignmentId.value,
        targetEntityType: 'ASSIGNMENT',
      }));
  }
}
