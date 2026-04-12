import { DirectorySyncState } from '../../../domain/entities/directory-sync-state.entity';
import { DirectorySyncStateRepositoryPort } from '../../../domain/repositories/directory-sync-state.repository.port';
import { M365PrismaMapper } from './m365-prisma.mapper';

interface IntegrationSyncStateGateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaDirectorySyncStateRepository implements DirectorySyncStateRepositoryPort {
  public constructor(private readonly gateway: IntegrationSyncStateGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<DirectorySyncState | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? M365PrismaMapper.toDirectorySyncState(record) : null;
  }

  public async findByScope(
    provider: string,
    resourceType: string,
    scopeKey: string,
  ): Promise<DirectorySyncState | null> {
    const record = await this.gateway.findFirst({
      where: { provider, resourceType, scopeKey },
    });
    return record ? M365PrismaMapper.toDirectorySyncState(record) : null;
  }

  public async save(aggregate: DirectorySyncState): Promise<void> {
    await this.gateway.upsert({
      create: {
        id: aggregate.id,
        lastError: aggregate.lastError ?? null,
        lastStatus: aggregate.lastStatus,
        lastSyncedAt: aggregate.lastSyncedAt ?? null,
        provider: aggregate.provider,
        resourceType: aggregate.resourceType,
        scopeKey: aggregate.scopeKey,
      },
      update: {
        lastError: aggregate.lastError ?? null,
        lastStatus: aggregate.lastStatus,
        lastSyncedAt: aggregate.lastSyncedAt ?? null,
      },
      where: {
        provider_resourceType_scopeKey: {
          provider: aggregate.provider,
          resourceType: aggregate.resourceType,
          scopeKey: aggregate.scopeKey,
        },
      },
    });
  }
}
