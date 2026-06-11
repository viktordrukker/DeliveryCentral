import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TransactionContext } from '@src/shared/domain/transaction-context';

import {
  ProjectPosition,
  type PositionPriorityValue,
} from '../domain/entities/project-position.entity';
import { ProjectPositionRepositoryPort } from '../domain/repositories/project-position-repository.port';
import { PositionId } from '../domain/value-objects/position-id';
import { PositionFillStatus } from '../domain/value-objects/position-fill-status';
import { ProjectPositionReferenceRepositoryPort } from './ports/project-position-reference.repository.port';

export interface CreateProjectPositionCommand {
  actorId: string;
  projectId: string;
  role: string;
  requiredAllocationPercent: number;
  startDate: string;
  endDate: string;
  skills?: string[];
  summary?: string;
  /** Staffing-queue sort key. Defaults to MEDIUM (schema default). */
  priority?: PositionPriorityValue;
  requestedByPersonId?: string;
  /** Open the position immediately. Default: DRAFT (still being shaped). */
  openImmediately?: boolean;
}

/**
 * S2-3 — create a new ProjectPosition (demand record).
 *
 * Validates references (project exists + active) and minimal invariants
 * (allocation 0..100, dates ordered). Initial status is DRAFT unless
 * `openImmediately` is set, in which case the position lands in OPEN
 * (RM/DM can immediately propose candidates).
 *
 * Persistence delegates to the repository port — Prisma adapter lives in
 * `infrastructure/repositories/prisma/prisma-project-position.repository.ts`.
 */
@Injectable()
export class CreateProjectPositionService {
  public constructor(
    private readonly repository: ProjectPositionRepositoryPort,
    private readonly referenceRepository?: ProjectPositionReferenceRepositoryPort,
  ) {}

  public async execute(
    command: CreateProjectPositionCommand,
    tx?: TransactionContext,
  ): Promise<ProjectPosition> {
    const startDate = new Date(command.startDate);
    const endDate = new Date(command.endDate);

    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Position start date is invalid.');
    }
    if (Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Position end date is invalid.');
    }
    if (endDate < startDate) {
      throw new BadRequestException('Position end date must be on or after the start date.');
    }
    if (command.requiredAllocationPercent < 0 || command.requiredAllocationPercent > 100) {
      throw new BadRequestException('Required allocation percent must be between 0 and 100.');
    }
    if (!command.role || command.role.trim().length === 0) {
      throw new BadRequestException('Position role is required.');
    }

    if (this.referenceRepository) {
      const projectExists = await this.referenceRepository.projectExists(command.projectId);
      if (!projectExists) {
        throw new NotFoundException('Project does not exist.');
      }
      const projectIsActive = await this.referenceRepository.projectIsActive(command.projectId);
      if (!projectIsActive) {
        // 409, matching the Wave-1 filter convention: a state conflict on the
        // referenced entity, not a malformed request.
        throw new ConflictException(
          'Project is closed or archived — positions cannot be created on it.',
        );
      }
      // Only validate `requestedByPersonId` when explicitly provided: the
      // actorId fallback may be a userId (principal without a personId) and
      // is not guaranteed to be a Person reference.
      if (command.requestedByPersonId) {
        const personExists = await this.referenceRepository.personExists(
          command.requestedByPersonId,
        );
        if (!personExists) {
          throw new NotFoundException('Requested-by person does not exist.');
        }
        const personIsActive = await this.referenceRepository.personIsActive(
          command.requestedByPersonId,
        );
        if (!personIsActive) {
          throw new ConflictException('Requested-by person is not an active employee.');
        }
      }
    }

    const fillStatus = command.openImmediately
      ? PositionFillStatus.open()
      : PositionFillStatus.draft();

    const position = ProjectPosition.create(
      {
        projectId: command.projectId,
        role: command.role,
        skills: command.skills,
        summary: command.summary,
        priority: command.priority,
        requiredAllocationPercent: command.requiredAllocationPercent,
        startDate,
        endDate,
        fillStatus,
        requestedByPersonId: command.requestedByPersonId ?? command.actorId,
        createdByPersonId: command.actorId,
        updatedByPersonId: command.actorId,
      },
      PositionId.create(),
    );

    await this.repository.save(position, tx);
    return position;
  }
}
