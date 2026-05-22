import { Prisma } from '@prisma/client';

import { ExternalAccountLink } from '../../../domain/entities/external-account-link.entity';
import { ExternalAccountLinkRepositoryPort } from '../../../domain/repositories/external-account-link.repository.port';
import { RadiusPrismaMapper } from './radius-prisma.mapper';

// 20c-10 — typed Prisma delegate slice.
type ExternalAccountLinkGateway = Pick<
  Prisma.ExternalAccountLinkDelegate,
  'delete' | 'findFirst' | 'findMany' | 'upsert'
>;

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
        // 20c-10 — domain string ↔ Prisma enum.
        accountPresenceState: (aggregate.accountPresenceState ?? null) as Prisma.ExternalAccountLinkCreateInput['accountPresenceState'],
        externalAccountId: aggregate.externalAccountId,
        externalDisplayName: aggregate.externalDisplayName ?? null,
        externalEmail: aggregate.externalEmail ?? null,
        externalUsername: aggregate.externalUsername ?? null,
        lastSeenAt: aggregate.lastSeenAt ?? null,
        matchedByStrategy: aggregate.matchedByStrategy ?? null,
        personId: aggregate.personId ?? null,
        provider: aggregate.provider,
        // 20c-10 — domain string ↔ Prisma enum; same union, cast through.
        sourceType: aggregate.sourceType as Prisma.ExternalAccountLinkCreateInput['sourceType'],
        sourceUpdatedAt: aggregate.sourceUpdatedAt ?? null,
      },
      update: {
        // 20c-10 — domain string ↔ Prisma enum.
        accountPresenceState: (aggregate.accountPresenceState ?? null) as Prisma.ExternalAccountLinkCreateInput['accountPresenceState'],
        externalDisplayName: aggregate.externalDisplayName ?? null,
        externalEmail: aggregate.externalEmail ?? null,
        externalUsername: aggregate.externalUsername ?? null,
        lastSeenAt: aggregate.lastSeenAt ?? null,
        matchedByStrategy: aggregate.matchedByStrategy ?? null,
        personId: aggregate.personId ?? null,
        // 20c-10 — domain string ↔ Prisma enum; same union, cast through.
        sourceType: aggregate.sourceType as Prisma.ExternalAccountLinkCreateInput['sourceType'],
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
