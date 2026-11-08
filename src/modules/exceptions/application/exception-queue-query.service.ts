import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';

import { PROJECT_POSITION_REPOSITORY } from '@src/modules/project-positions/application/tokens';
import { ProjectPosition } from '@src/modules/project-positions/domain/entities/project-position.entity';
import { ProjectPositionRepositoryPort } from '@src/modules/project-positions/domain/repositories/project-position-repository.port';
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

const ACTIVE_FILL_STATUSES = ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] as const;

@Injectable()
export class ExceptionQueueQueryService {
  public constructor(
    @Inject(PROJECT_POSITION_REPOSITORY)
    private readonly projectPositionRepository: ProjectPositionRepositoryPort,
    private readonly projectRepository: InMemoryProjectRepository,
    private readonly appConfig: AppConfig,
    @Optional() private readonly resolutionStore: ExceptionResolutionStore | null = null,
  ) {}

  public async getQueue(query: ExceptionQueueQuery = {}): Promise<ExceptionQueueResponseDto> {
    const asOf = this.resolveAsOf(query.asOf);

    // SoT PR 16a/1 — sourced from canonical ProjectPosition rows. We need
    // both active fills (closure-conflict signals) and PROPOSED candidates
    // (stale-approval signals).
    const [activePositions, proposedPositions, projects] = await Promise.all([
      this.projectPositionRepository.findByQuery({
        fillStatuses: ACTIVE_FILL_STATUSES,
        asOf,
      }),
      this.projectPositionRepository.findByQuery({
        fillStatuses: ['PROPOSED'],
      }),
      this.projectRepository.findAll(),
    ]);

    const items = [
      ...this.buildProjectClosureConflicts(projects, activePositions, asOf),
      ...this.buildStaleApprovals(proposedPositions, asOf),
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

  private buildProjectClosureConflicts(
    projects: Array<{ projectId: { value: string }; status: string; name: string }>,
    activePositions: ProjectPosition[],
    asOf: Date,
  ): ExceptionQueueItemDto[] {
    const items: ExceptionQueueItemDto[] = [];

    for (const project of projects.filter((item) => item.status === 'CLOSED')) {
      const projectPositions = activePositions.filter(
        (position) => position.projectId === project.projectId.value,
      );

      if (projectPositions.length === 0) {
        continue;
      }

      items.push({
        category: 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS',
        details: {
          activeAssignmentCount: projectPositions.length,
          activeAssignmentIds: projectPositions.map((position) => position.positionId.value),
        },
        id: `project-closure-with-active-assignments:${project.projectId.value}`,
        observedAt: asOf.toISOString(),
        projectId: project.projectId.value,
        projectName: project.name,
        sourceContext: 'project',
        status: 'OPEN',
        summary: `Closed project ${project.name} still has ${projectPositions.length} active assignment${projectPositions.length === 1 ? '' : 's'}.`,
        targetEntityId: project.projectId.value,
        targetEntityType: 'PROJECT',
      });
    }

    return items;
  }

  private buildStaleApprovals(
    proposedPositions: ProjectPosition[],
    asOf: Date,
  ): ExceptionQueueItemDto[] {
    const thresholdMs = this.appConfig.exceptionsStaleApprovalDays * 24 * 60 * 60 * 1000;

    return proposedPositions
      .filter((position) => {
        // Use activeValidFrom as a proxy for "when this candidate was proposed".
        // PROPOSED transitions set activeValidFrom (see ProjectPosition.transitionFill).
        const requestedAt = position.activeValidFrom;
        return requestedAt !== undefined && asOf.getTime() - requestedAt.getTime() >= thresholdMs;
      })
      .map((position) => {
        const requestedAt = position.activeValidFrom!;
        return {
          assignmentId: position.positionId.value,
          category: 'STALE_ASSIGNMENT_APPROVAL' as const,
          details: {
            requestedAt: requestedAt.toISOString(),
            staleDays: Math.floor((asOf.getTime() - requestedAt.getTime()) / (24 * 60 * 60 * 1000)),
          },
          id: `stale-assignment-approval:${position.positionId.value}`,
          observedAt: requestedAt.toISOString(),
          personDisplayName: undefined,
          personId: position.activePersonId ?? '',
          projectId: position.projectId,
          projectName: undefined,
          sourceContext: 'assignment' as const,
          status: 'OPEN' as const,
          summary: `Assignment approval request has been stale since ${requestedAt.toISOString()}.`,
          targetEntityId: position.positionId.value,
          targetEntityType: 'ASSIGNMENT',
        };
      });
  }
}
