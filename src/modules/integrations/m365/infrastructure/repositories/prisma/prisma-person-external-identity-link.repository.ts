import { PersonExternalIdentityLink } from '../../../domain/entities/person-external-identity-link.entity';
import { PersonExternalIdentityLinkRepositoryPort } from '../../../domain/repositories/person-external-identity-link.repository.port';
import { M365PrismaMapper } from './m365-prisma.mapper';

interface PersonExternalIdentityLinkGateway {
  count(args?: any): Promise<number>;
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaPersonExternalIdentityLinkRepository
  implements PersonExternalIdentityLinkRepositoryPort
{
  public constructor(private readonly gateway: PersonExternalIdentityLinkGateway) {}

  public async countByProvider(provider: string): Promise<number> {
    return this.gateway.count({ where: { provider, archivedAt: null } });
  }

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findByExternalUserId(
    provider: string,
    externalUserId: string,
  ): Promise<PersonExternalIdentityLink | null> {
    const record = await this.gateway.findFirst({
      where: { archivedAt: null, externalUserId, provider },
    });
    return record ? M365PrismaMapper.toPersonExternalIdentityLink(record) : null;
  }

  public async findById(id: string): Promise<PersonExternalIdentityLink | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? M365PrismaMapper.toPersonExternalIdentityLink(record) : null;
  }

  public async findByPersonId(
    provider: string,
    personId: string,
  ): Promise<PersonExternalIdentityLink | null> {
    const record = await this.gateway.findFirst({
      where: { archivedAt: null, personId, provider },
    });
    return record ? M365PrismaMapper.toPersonExternalIdentityLink(record) : null;
  }

  public async listByProvider(provider: string): Promise<PersonExternalIdentityLink[]> {
    const records = await this.gateway.findMany({
      where: { archivedAt: null, provider },
    });
    return records.map((record) => M365PrismaMapper.toPersonExternalIdentityLink(record));
  }

  public async save(aggregate: PersonExternalIdentityLink): Promise<void> {
    await this.gateway.upsert({
      create: {
        externalManagerUserId: aggregate.externalManagerUserId ?? null,
        externalPrincipalName: aggregate.externalPrincipalName ?? null,
        externalUserId: aggregate.externalUserId,
        id: aggregate.id,
        lastSeenAt: aggregate.lastSeenAt ?? null,
        matchedByStrategy: aggregate.matchedByStrategy,
        personId: aggregate.personId,
        provider: aggregate.provider,
        resolvedManagerPersonId: aggregate.resolvedManagerPersonId ?? null,
        sourceAccountEnabled: aggregate.sourceAccountEnabled ?? null,
        sourceDepartment: aggregate.sourceDepartment ?? null,
        sourceJobTitle: aggregate.sourceJobTitle ?? null,
        sourceUpdatedAt: aggregate.sourceUpdatedAt ?? null,
      },
      update: {
        externalManagerUserId: aggregate.externalManagerUserId ?? null,
        externalPrincipalName: aggregate.externalPrincipalName ?? null,
        externalUserId: aggregate.externalUserId,
        lastSeenAt: aggregate.lastSeenAt ?? null,
        matchedByStrategy: aggregate.matchedByStrategy,
        personId: aggregate.personId,
        provider: aggregate.provider,
        resolvedManagerPersonId: aggregate.resolvedManagerPersonId ?? null,
        sourceAccountEnabled: aggregate.sourceAccountEnabled ?? null,
        sourceDepartment: aggregate.sourceDepartment ?? null,
        sourceJobTitle: aggregate.sourceJobTitle ?? null,
        sourceUpdatedAt: aggregate.sourceUpdatedAt ?? null,
      },
      where: { id: aggregate.id },
    });
  }
}
