import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { ProjectRepositoryPort } from '@src/modules/project-registry/domain/repositories/project-repository.port';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';
import { ProjectLifecycleConflictError } from '@src/modules/project-registry/application/project-lifecycle-conflict.error';

import { ProjectRegistryPrismaMapper } from './project-registry-prisma.mapper';

interface ProjectGateway {
  create(args: any): Promise<unknown>;
  delete(args: any): Promise<unknown>;
  findMany(args?: any): Promise<any[]>;
  findFirst(args: any): Promise<any | null>;
  updateMany(args: any): Promise<{ count: number }>;
}

export class PrismaProjectRepository implements ProjectRepositoryPort {
  public constructor(private readonly gateway: ProjectGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<Project | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? ProjectRegistryPrismaMapper.toDomainProject(record) : null;
  }

  public async findByProjectCode(projectCode: string): Promise<Project | null> {
    const record = await this.gateway.findFirst({ where: { projectCode } });
    return record ? ProjectRegistryPrismaMapper.toDomainProject(record) : null;
  }

  public async findAll(): Promise<Project[]> {
    const records = await this.gateway.findMany();
    return records.map((record) => ProjectRegistryPrismaMapper.toDomainProject(record));
  }

  public async findByProjectId(projectId: ProjectId): Promise<Project | null> {
    return this.findById(projectId.value);
  }

  public async assertCurrentVersion(projectId: ProjectId, version: number): Promise<Project> {
    const record = await this.gateway.findFirst({
      where: {
        id: projectId.value,
        version,
      },
    });

    if (!record) {
      throw new ProjectLifecycleConflictError();
    }

    return ProjectRegistryPrismaMapper.toDomainProject(record);
  }

  public async save(aggregate: Project): Promise<void> {
    const persisted = await this.gateway.findFirst({ where: { id: aggregate.id } });

    if (!persisted) {
      aggregate.synchronizeVersion(1);
      await this.gateway.create({
        data: {
          archivedAt: aggregate.archivedAt ?? null,
          description: aggregate.description ?? null,
          endsOn: aggregate.endsOn ?? null,
          id: aggregate.id,
          name: aggregate.name,
          projectManagerId: aggregate.projectManagerId?.value ?? null,
          projectCode: aggregate.projectCode,
          startsOn: aggregate.startsOn ?? null,
          status: aggregate.status,
          version: aggregate.version,
        },
      });
      return;
    }

    const nextVersion = aggregate.version + 1;
    const result = await this.gateway.updateMany({
      data: {
        archivedAt: aggregate.archivedAt ?? null,
        description: aggregate.description ?? null,
        endsOn: aggregate.endsOn ?? null,
        name: aggregate.name,
        projectManagerId: aggregate.projectManagerId?.value ?? null,
        projectCode: aggregate.projectCode,
        startsOn: aggregate.startsOn ?? null,
        status: aggregate.status,
        version: nextVersion,
      },
      where: {
        id: aggregate.id,
        version: aggregate.version,
      },
    });

    if (result.count === 0) {
      throw new ProjectLifecycleConflictError();
    }

    aggregate.synchronizeVersion(nextVersion);
  }
}
