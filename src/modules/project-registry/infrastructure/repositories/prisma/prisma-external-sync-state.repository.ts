import { Prisma } from '@prisma/client';

import { ExternalSyncState } from '@src/modules/project-registry/domain/entities/external-sync-state.entity';
import { ExternalSyncStateRepositoryPort } from '@src/modules/project-registry/domain/repositories/external-sync-state-repository.port';

import { ProjectRegistryPrismaMapper } from './project-registry-prisma.mapper';

// F-81 / 20c-10 — drop the hand-rolled gateway (~10 lines of inline
// payload-shape duplication with the syncStatus enum literal) in favor
// of `Pick<>` over Prisma's typed delegate.
type ExternalSyncStateGateway = Pick<
  Prisma.ExternalSyncStateDelegate,
  'delete' | 'findFirst' | 'upsert'
>;

export class PrismaExternalSyncStateRepository implements ExternalSyncStateRepositoryPort {
  public constructor(private readonly gateway: ExternalSyncStateGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<ExternalSyncState | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? ProjectRegistryPrismaMapper.toDomainExternalSyncState(record) : null;
  }

  public async findByProjectExternalLinkId(
    projectExternalLinkId: string,
  ): Promise<ExternalSyncState | null> {
    const record = await this.gateway.findFirst({
      where: {
        projectExternalLinkId,
      },
    });

    return record ? ProjectRegistryPrismaMapper.toDomainExternalSyncState(record) : null;
  }

  public async save(aggregate: ExternalSyncState): Promise<void> {
    await this.gateway.upsert({
      create: {
        id: aggregate.id,
        lastError: aggregate.lastError ?? null,
        lastPayloadFingerprint: aggregate.lastPayloadFingerprint ?? null,
        lastSuccessfulSyncedAt: aggregate.lastSuccessfulSyncedAt ?? null,
        lastSyncedAt: aggregate.lastSyncedAt ?? null,
        projectExternalLinkId: aggregate.projectExternalLinkId,
        syncStatus: aggregate.syncStatus,
      },
      update: {
        lastError: aggregate.lastError ?? null,
        lastPayloadFingerprint: aggregate.lastPayloadFingerprint ?? null,
        lastSuccessfulSyncedAt: aggregate.lastSuccessfulSyncedAt ?? null,
        lastSyncedAt: aggregate.lastSyncedAt ?? null,
        projectExternalLinkId: aggregate.projectExternalLinkId,
        syncStatus: aggregate.syncStatus,
      },
      where: { id: aggregate.id },
    });
  }
}
