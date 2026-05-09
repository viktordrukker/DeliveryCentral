import { RepositoryPort } from '@src/shared/domain/repository-port';
import { TransactionContext } from '@src/shared/domain/transaction-context';

import { Project } from '../entities/project.entity';
import { ProjectId } from '../value-objects/project-id';

export interface ProjectRepositoryPort extends RepositoryPort<Project> {
  /** Save the aggregate, optionally inside an existing transaction. */
  save(aggregate: Project, tx?: TransactionContext): Promise<void>;
  /** Delete the aggregate, optionally inside an existing transaction. */
  delete(id: string, tx?: TransactionContext): Promise<void>;
  assertCurrentVersion(projectId: ProjectId, version: number): Promise<Project>;
  findAll(): Promise<Project[]>;
  findByProjectCode(projectCode: string): Promise<Project | null>;
  findByProjectId(projectId: ProjectId): Promise<Project | null>;
}
