import { ProjectExternalLink } from '@src/modules/project-registry/domain/entities/project-external-link.entity';
import { ProjectExternalLinkRepositoryPort } from '@src/modules/project-registry/domain/repositories/project-external-link-repository.port';
import { ExternalProjectKey } from '@src/modules/project-registry/domain/value-objects/external-project-key';
import { ExternalSystemType } from '@src/modules/project-registry/domain/value-objects/external-system-type';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';

export class InMemoryProjectExternalLinkRepository
  implements ProjectExternalLinkRepositoryPort
{
  public constructor(private readonly items: ProjectExternalLink[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findByExternalKey(
    systemType: ExternalSystemType,
    externalProjectKey: ExternalProjectKey,
  ): Promise<ProjectExternalLink | null> {
    return (
      this.items.find(
        (item) =>
          item.systemType.equals(systemType) &&
          item.externalProjectKey.equals(externalProjectKey),
      ) ?? null
    );
  }

  public async findById(id: string): Promise<ProjectExternalLink | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async findAll(): Promise<ProjectExternalLink[]> {
    return [...this.items];
  }

  public async findByProjectId(projectId: ProjectId): Promise<ProjectExternalLink[]> {
    return this.items.filter((item) => item.projectId.equals(projectId));
  }

  public async save(aggregate: ProjectExternalLink): Promise<void> {
    const index = this.items.findIndex((item) => item.id === aggregate.id);
    if (index >= 0) {
      this.items.splice(index, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
