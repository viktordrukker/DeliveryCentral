import { RadiusReconciliationRecord } from '../../../domain/entities/radius-reconciliation-record.entity';
import { RadiusReconciliationRecordRepositoryPort } from '../../../domain/repositories/radius-reconciliation-record.repository.port';
import { RadiusPrismaMapper } from './radius-prisma.mapper';

interface RadiusReconciliationGateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaRadiusReconciliationRecordRepository
  implements RadiusReconciliationRecordRepositoryPort
{
  public constructor(private readonly gateway: RadiusReconciliationGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findByExternalAccountId(
    provider: string,
    externalAccountId: string,
  ): Promise<RadiusReconciliationRecord | null> {
    const record = await this.gateway.findFirst({
      where: { externalAccountId, provider },
    });
    return record ? RadiusPrismaMapper.toRadiusReconciliationRecord(record) : null;
  }

  public async findById(id: string): Promise<RadiusReconciliationRecord | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? RadiusPrismaMapper.toRadiusReconciliationRecord(record) : null;
  }

  public async listByProvider(provider: string): Promise<RadiusReconciliationRecord[]> {
    const records = await this.gateway.findMany({
      where: { provider },
    });
    return records.map((record) => RadiusPrismaMapper.toRadiusReconciliationRecord(record));
  }

  public async save(aggregate: RadiusReconciliationRecord): Promise<void> {
    await this.gateway.upsert({
      create: {
        accountPresenceState: aggregate.accountPresenceState ?? null,
        candidatePersonIds: aggregate.candidatePersonIds,
        category: aggregate.category,
        externalAccountId: aggregate.externalAccountId,
        externalDisplayName: aggregate.externalDisplayName ?? null,
        externalEmail: aggregate.externalEmail ?? null,
        externalUsername: aggregate.externalUsername ?? null,
        id: aggregate.id,
        lastEvaluatedAt: aggregate.lastEvaluatedAt,
        lastSeenAt: aggregate.lastSeenAt ?? null,
        matchedByStrategy: aggregate.matchedByStrategy ?? null,
        personId: aggregate.personId ?? null,
        provider: aggregate.provider,
        sourceType: aggregate.sourceType,
        sourceUpdatedAt: aggregate.sourceUpdatedAt ?? null,
        summary: aggregate.summary,
      },
      update: {
        accountPresenceState: aggregate.accountPresenceState ?? null,
        candidatePersonIds: aggregate.candidatePersonIds,
        category: aggregate.category,
        externalDisplayName: aggregate.externalDisplayName ?? null,
        externalEmail: aggregate.externalEmail ?? null,
        externalUsername: aggregate.externalUsername ?? null,
        lastEvaluatedAt: aggregate.lastEvaluatedAt,
        lastSeenAt: aggregate.lastSeenAt ?? null,
        matchedByStrategy: aggregate.matchedByStrategy ?? null,
        personId: aggregate.personId ?? null,
        provider: aggregate.provider,
        sourceType: aggregate.sourceType,
        sourceUpdatedAt: aggregate.sourceUpdatedAt ?? null,
        summary: aggregate.summary,
      },
      where: {
        provider_externalAccountId: {
          externalAccountId: aggregate.externalAccountId,
          provider: aggregate.provider,
        },
      },
    });
  }
}
