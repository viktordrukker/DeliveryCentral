import { RepositoryPort } from '@src/shared/domain/repository-port';

import { Project } from '../entities/project.entity';
import { ProjectId } from '../value-objects/project-id';

export interface ProjectRepositoryPort extends RepositoryPort<Project> {
  assertCurrentVersion(projectId: ProjectId, version: number): Promise<Project>;
  findAll(): Promise<Project[]>;
  findByProjectCode(projectCode: string): Promise<Project | null>;
  findByProjectId(projectId: ProjectId): Promise<Project | null>;
}
