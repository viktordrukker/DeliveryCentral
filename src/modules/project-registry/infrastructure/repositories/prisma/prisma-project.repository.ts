import { Logger } from '@nestjs/common';

import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { ProjectRepositoryPort } from '@src/modules/project-registry/domain/repositories/project-repository.port';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';
import { ProjectLifecycleConflictError } from '@src/modules/project-registry/application/project-lifecycle-conflict.error';
import { TransactionContext } from '@src/shared/domain/transaction-context';

import { ProjectRegistryPrismaMapper } from './project-registry-prisma.mapper';

interface ProjectGateway {
  create(args: any): Promise<unknown>;
  delete(args: any): Promise<unknown>;
  findMany(args?: any): Promise<any[]>;
  findFirst(args: any): Promise<any | null>;
  updateMany(args: any): Promise<{ count: number }>;
}

interface TxClientWithProject {
  project: ProjectGateway;
}

// F-18 / 20c-12 — cap on findAll(). Mid-size bank tenant tops out around
// 200–500 projects; a 2,000 cap leaves comfortable headroom and surfaces
// over-growth via the warn log before perf degrades.
const FIND_ALL_MAX = 2000;

export class PrismaProjectRepository implements ProjectRepositoryPort {
  private readonly logger = new Logger(PrismaProjectRepository.name);

  public constructor(private readonly gateway: ProjectGateway) {}

  /** Resolve the gateway: external `tx` overrides the constructor-injected one. */
  private resolveGateway(tx?: TransactionContext): ProjectGateway {
    if (tx && typeof tx === 'object' && tx !== null && 'project' in tx) {
      return (tx as TxClientWithProject).project;
    }
    return this.gateway;
  }

  public async delete(id: string, tx?: TransactionContext): Promise<void> {
    await this.resolveGateway(tx).delete({ where: { id } });
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
    const records = await this.gateway.findMany({ take: FIND_ALL_MAX });
    if (records.length === FIND_ALL_MAX) {
      this.logger.warn(`findAll() hit the ${FIND_ALL_MAX}-row cap; some projects omitted.`);
    }
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

  public async save(aggregate: Project, tx?: TransactionContext): Promise<void> {
    const gateway = this.resolveGateway(tx);
    const persisted = await gateway.findFirst({ where: { id: aggregate.id } });

    if (!persisted) {
      aggregate.synchronizeVersion(1);
      await gateway.create({
        data: {
          archivedAt: aggregate.archivedAt ?? null,
          clientId: aggregate.clientId ?? null,
          deliveryManagerId: aggregate.deliveryManagerId?.value ?? null,
          description: aggregate.description ?? null,
          domain: aggregate.domain ?? null,
          endsOn: aggregate.endsOn ?? null,
          engagementModel: aggregate.engagementModel as any ?? null,
          id: aggregate.id,
          lessonsLearned: aggregate.lessonsLearned ?? null,
          name: aggregate.name,
          outcomeRating: aggregate.outcomeRating ?? null,
          priority: aggregate.priority as any ?? null,
          projectCode: aggregate.projectCode,
          projectManagerId: aggregate.projectManagerId?.value ?? null,
          projectType: aggregate.projectType ?? null,
          startsOn: aggregate.startsOn ?? null,
          status: aggregate.status,
          tags: aggregate.tags,
          techStack: aggregate.techStack,
          version: aggregate.version,
          wouldStaffSameWay: aggregate.wouldStaffSameWay ?? null,
        },
      });
      return;
    }

    const nextVersion = aggregate.version + 1;
    const result = await gateway.updateMany({
      data: {
        archivedAt: aggregate.archivedAt ?? null,
        clientId: aggregate.clientId ?? null,
        deliveryManagerId: aggregate.deliveryManagerId?.value ?? null,
        description: aggregate.description ?? null,
        domain: aggregate.domain ?? null,
        endsOn: aggregate.endsOn ?? null,
        engagementModel: aggregate.engagementModel as any ?? null,
        lessonsLearned: aggregate.lessonsLearned ?? null,
        name: aggregate.name,
        outcomeRating: aggregate.outcomeRating ?? null,
        priority: aggregate.priority as any ?? null,
        projectCode: aggregate.projectCode,
        projectManagerId: aggregate.projectManagerId?.value ?? null,
        projectType: aggregate.projectType ?? null,
        startsOn: aggregate.startsOn ?? null,
        status: aggregate.status,
        tags: aggregate.tags,
        techStack: aggregate.techStack,
        version: nextVersion,
        wouldStaffSameWay: aggregate.wouldStaffSameWay ?? null,
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
