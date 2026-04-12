import { ExternalAccountLink } from '../../../domain/entities/external-account-link.entity';
import { ExternalAccountLinkRepositoryPort } from '../../../domain/repositories/external-account-link.repository.port';
import { RadiusPrismaMapper } from './radius-prisma.mapper';

interface ExternalAccountLinkGateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaExternalAccountLinkRepository implements ExternalAccountLinkRepositoryPort {
  public constructor(private readonly gateway: ExternalAccountLinkGateway) {}

  public async countByProvider(provider: string): Promise<number> {
    const records = await this.gateway.findMany({ where: { provider } });
    return records.length;
  }

  public async countUnlinkedByProvider(provider: string): Promise<number> {
    const records = await this.gateway.findMany({ where: { personId: null, provider } });
    return records.length;
  }

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findByExternalAccountId(
    provider: string,
    externalAccountId: string,
  ): Promise<ExternalAccountLink | null> {
    const record = await this.gateway.findFirst({ where: { provider, externalAccountId } });
    return record ? RadiusPrismaMapper.toExternalAccountLink(record) : null;
  }

  public async findById(id: string): Promise<ExternalAccountLink | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? RadiusPrismaMapper.toExternalAccountLink(record) : null;
  }

  public async listByProvider(provider: string): Promise<ExternalAccountLink[]> {
    const records = await this.gateway.findMany({ where: { provider } });
    return records.map((record) => RadiusPrismaMapper.toExternalAccountLink(record));
  }

  public async save(aggregate: ExternalAccountLink): Promise<void> {
    await this.gateway.upsert({
      create: {
        id: aggregate.id,
        accountPresenceState: aggregate.accountPresenceState ?? null,
        externalAccountId: aggregate.externalAccountId,
        externalDisplayName: aggregate.externalDisplayName ?? null,
        externalEmail: aggregate.externalEmail ?? null,
        externalUsername: aggregate.externalUsername ?? null,
        lastSeenAt: aggregate.lastSeenAt ?? null,
        matchedByStrategy: aggregate.matchedByStrategy ?? null,
        personId: aggregate.personId ?? null,
        provider: aggregate.provider,
        sourceType: aggregate.sourceType,
        sourceUpdatedAt: aggregate.sourceUpdatedAt ?? null,
      },
      update: {
        accountPresenceState: aggregate.accountPresenceState ?? null,
        externalDisplayName: aggregate.externalDisplayName ?? null,
        externalEmail: aggregate.externalEmail ?? null,
        externalUsername: aggregate.externalUsername ?? null,
        lastSeenAt: aggregate.lastSeenAt ?? null,
        matchedByStrategy: aggregate.matchedByStrategy ?? null,
        personId: aggregate.personId ?? null,
        sourceType: aggregate.sourceType,
        sourceUpdatedAt: aggregate.sourceUpdatedAt ?? null,
      },
      where: {
        provider_externalAccountId: {
          provider: aggregate.provider,
          externalAccountId: aggregate.externalAccountId,
        },
      },
    });
  }
}
