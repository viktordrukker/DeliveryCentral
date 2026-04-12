import { M365DirectoryReconciliationRecord } from '../../../domain/entities/m365-directory-reconciliation-record.entity';
import { M365DirectoryReconciliationRecordRepositoryPort } from '../../../domain/repositories/m365-directory-reconciliation-record.repository.port';
import { M365PrismaMapper } from './m365-prisma.mapper';

interface M365DirectoryReconciliationGateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaM365DirectoryReconciliationRecordRepository
  implements M365DirectoryReconciliationRecordRepositoryPort
{
  public constructor(private readonly gateway: M365DirectoryReconciliationGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findByExternalUserId(
    provider: string,
    externalUserId: string,
  ): Promise<M365DirectoryReconciliationRecord | null> {
    const record = await this.gateway.findFirst({
      where: { externalUserId, provider },
    });
    return record ? M365PrismaMapper.toM365DirectoryReconciliationRecord(record) : null;
  }

  public async findById(id: string): Promise<M365DirectoryReconciliationRecord | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? M365PrismaMapper.toM365DirectoryReconciliationRecord(record) : null;
  }

  public async listByProvider(provider: string): Promise<M365DirectoryReconciliationRecord[]> {
    const records = await this.gateway.findMany({
      where: { provider },
    });

    return records.map((record) => M365PrismaMapper.toM365DirectoryReconciliationRecord(record));
  }

  public async save(aggregate: M365DirectoryReconciliationRecord): Promise<void> {
    await this.gateway.upsert({
      create: {
        candidatePersonIds: aggregate.candidatePersonIds,
        category: aggregate.category,
        externalDisplayName: aggregate.externalDisplayName ?? null,
        externalEmail: aggregate.externalEmail ?? null,
        externalPrincipalName: aggregate.externalPrincipalName ?? null,
        externalUserId: aggregate.externalUserId,
        id: aggregate.id,
        lastEvaluatedAt: aggregate.lastEvaluatedAt,
        lastSeenAt: aggregate.lastSeenAt ?? null,
        matchedByStrategy: aggregate.matchedByStrategy ?? null,
        personId: aggregate.personId ?? null,
        provider: aggregate.provider,
        resolvedManagerPersonId: aggregate.resolvedManagerPersonId ?? null,
        sourceAccountEnabled: aggregate.sourceAccountEnabled ?? null,
        sourceDepartment: aggregate.sourceDepartment ?? null,
        sourceJobTitle: aggregate.sourceJobTitle ?? null,
        sourceUpdatedAt: aggregate.sourceUpdatedAt ?? null,
        summary: aggregate.summary,
      },
      update: {
        candidatePersonIds: aggregate.candidatePersonIds,
        category: aggregate.category,
        externalDisplayName: aggregate.externalDisplayName ?? null,
        externalEmail: aggregate.externalEmail ?? null,
        externalPrincipalName: aggregate.externalPrincipalName ?? null,
        externalUserId: aggregate.externalUserId,
        lastEvaluatedAt: aggregate.lastEvaluatedAt,
        lastSeenAt: aggregate.lastSeenAt ?? null,
        matchedByStrategy: aggregate.matchedByStrategy ?? null,
        personId: aggregate.personId ?? null,
        provider: aggregate.provider,
        resolvedManagerPersonId: aggregate.resolvedManagerPersonId ?? null,
        sourceAccountEnabled: aggregate.sourceAccountEnabled ?? null,
        sourceDepartment: aggregate.sourceDepartment ?? null,
        sourceJobTitle: aggregate.sourceJobTitle ?? null,
        sourceUpdatedAt: aggregate.sourceUpdatedAt ?? null,
        summary: aggregate.summary,
      },
      where: {
        provider_externalUserId: {
          externalUserId: aggregate.externalUserId,
          provider: aggregate.provider,
        },
      },
    });
  }
}
