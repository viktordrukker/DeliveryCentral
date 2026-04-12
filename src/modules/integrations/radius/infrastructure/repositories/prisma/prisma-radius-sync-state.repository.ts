import { RadiusSyncState } from '../../../domain/entities/radius-sync-state.entity';
import { RadiusSyncStateRepositoryPort } from '../../../domain/repositories/radius-sync-state.repository.port';
import { RadiusPrismaMapper } from './radius-prisma.mapper';

interface IntegrationSyncStateGateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaRadiusSyncStateRepository implements RadiusSyncStateRepositoryPort {
  public constructor(private readonly gateway: IntegrationSyncStateGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<RadiusSyncState | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? RadiusPrismaMapper.toRadiusSyncState(record) : null;
  }

  public async findByScope(
    provider: string,
    resourceType: string,
    scopeKey: string,
  ): Promise<RadiusSyncState | null> {
    const record = await this.gateway.findFirst({ where: { provider, resourceType, scopeKey } });
    return record ? RadiusPrismaMapper.toRadiusSyncState(record) : null;
  }

  public async save(aggregate: RadiusSyncState): Promise<void> {
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
