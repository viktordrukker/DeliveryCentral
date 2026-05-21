import { Prisma } from '@prisma/client';

import { ProjectExternalLink } from '@src/modules/project-registry/domain/entities/project-external-link.entity';
import { ProjectExternalLinkRepositoryPort } from '@src/modules/project-registry/domain/repositories/project-external-link-repository.port';
import { ExternalProjectKey } from '@src/modules/project-registry/domain/value-objects/external-project-key';
import { ExternalSystemType } from '@src/modules/project-registry/domain/value-objects/external-system-type';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';

import { ProjectRegistryPrismaMapper } from './project-registry-prisma.mapper';

// F-75 / 20c-10 — drop the hand-rolled Gateway (mix of `any` args + inline
// payload-shape duplications) in favor of `Pick<>` over Prisma's typed
// delegate.
type ProjectExternalLinkGateway = Pick<
  Prisma.ProjectExternalLinkDelegate,
  'delete' | 'findFirst' | 'findMany' | 'upsert'
>;

export class PrismaProjectExternalLinkRepository
  implements ProjectExternalLinkRepositoryPort
{
  public constructor(private readonly gateway: ProjectExternalLinkGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findByExternalKey(
    systemType: ExternalSystemType,
    externalProjectKey: ExternalProjectKey,
  ): Promise<ProjectExternalLink | null> {
    const record = await this.gateway.findFirst({
      where: {
        externalProjectKey: externalProjectKey.value,
        provider: systemType.value,
      },
    });

    return record ? ProjectRegistryPrismaMapper.toDomainExternalLink(record) : null;
  }

  public async findById(id: string): Promise<ProjectExternalLink | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? ProjectRegistryPrismaMapper.toDomainExternalLink(record) : null;
  }

  public async findAll(): Promise<ProjectExternalLink[]> {
    const records = await this.gateway.findMany({});
    return records.map((record) => ProjectRegistryPrismaMapper.toDomainExternalLink(record));
  }

  public async findByProjectId(projectId: ProjectId): Promise<ProjectExternalLink[]> {
    const records = await this.gateway.findMany({
      where: {
        projectId: projectId.value,
      },
    });

    return records.map((record) => ProjectRegistryPrismaMapper.toDomainExternalLink(record));
  }

  public async save(aggregate: ProjectExternalLink): Promise<void> {
    await this.gateway.upsert({
      create: {
        archivedAt: aggregate.archivedAt ?? null,
        connectionKey: aggregate.connectionKey ?? null,
        externalProjectKey: aggregate.externalProjectKey.value,
        externalProjectName: aggregate.externalProjectName ?? null,
        externalUrl: aggregate.externalUrl ?? null,
        id: aggregate.id,
        projectId: aggregate.projectId.value,
        provider: aggregate.systemType.value,
        providerEnvironment: aggregate.providerEnvironment ?? null,
      },
      update: {
        archivedAt: aggregate.archivedAt ?? null,
        connectionKey: aggregate.connectionKey ?? null,
        externalProjectKey: aggregate.externalProjectKey.value,
        externalProjectName: aggregate.externalProjectName ?? null,
        externalUrl: aggregate.externalUrl ?? null,
        projectId: aggregate.projectId.value,
        provider: aggregate.systemType.value,
        providerEnvironment: aggregate.providerEnvironment ?? null,
      },
      where: { id: aggregate.id },
    });
  }
}
