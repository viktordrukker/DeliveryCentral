import { RepositoryPort } from '@src/shared/domain/repository-port';

import { ProjectExternalLink } from '../entities/project-external-link.entity';
import { ExternalProjectKey } from '../value-objects/external-project-key';
import { ExternalSystemType } from '../value-objects/external-system-type';
import { ProjectId } from '../value-objects/project-id';

export interface ProjectExternalLinkRepositoryPort extends RepositoryPort<ProjectExternalLink> {
  findAll(): Promise<ProjectExternalLink[]>;
  findByExternalKey(
    systemType: ExternalSystemType,
    externalProjectKey: ExternalProjectKey,
  ): Promise<ProjectExternalLink | null>;
  findByProjectId(projectId: ProjectId): Promise<ProjectExternalLink[]>;
}
