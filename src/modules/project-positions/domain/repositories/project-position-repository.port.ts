import { RepositoryPort } from '@src/shared/domain/repository-port';
import { TransactionContext } from '@src/shared/domain/transaction-context';

import { ProjectPosition } from '../entities/project-position.entity';
import { PositionId } from '../value-objects/position-id';
import type { PositionFillStatusValue } from '../value-objects/position-fill-status';

/**
 * Thrown by `save()` when the optimistic-concurrency version guard detects a
 * concurrent write (stored version no longer matches the aggregate's prior
 * version). Mapped to HTTP 409 by `PositionDomainExceptionFilter`.
 */
export class OptimisticConcurrencyConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'OptimisticConcurrencyConflictError';
  }
}

export interface ListProjectPositionsQuery {
  projectId?: string;
  activePersonId?: string;
  fillStatuses?: readonly PositionFillStatusValue[];
  /** Date for "as-of" point-in-time query against activeValidFrom/activeValidTo. */
  asOf?: Date;
  skip?: number;
  take?: number;
}

export interface ProjectPositionRepositoryPort extends RepositoryPort<ProjectPosition> {
  save(aggregate: ProjectPosition, tx?: TransactionContext): Promise<void>;
  delete(id: string, tx?: TransactionContext): Promise<void>;
  findById(id: string): Promise<ProjectPosition | null>;
  findByPositionId(positionId: PositionId): Promise<ProjectPosition | null>;
  findByQuery(query: ListProjectPositionsQuery): Promise<ProjectPosition[]>;
  countByQuery(query: Omit<ListProjectPositionsQuery, 'skip' | 'take'>): Promise<number>;
  /** Positions where the given Person is the active fill. */
  findActiveByPersonId(personId: string, asOf: Date): Promise<ProjectPosition[]>;
}
