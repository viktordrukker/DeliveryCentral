import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceRepositoryPort } from '@src/modules/work-evidence/domain/repositories/work-evidence-repository.port';
import { WorkEvidenceId } from '@src/modules/work-evidence/domain/value-objects/work-evidence-id';

import { WorkEvidencePrismaMapper } from './work-evidence-prisma.mapper';

interface WorkEvidenceGateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

interface WorkEvidenceSourceGateway {
  upsert(args: any): Promise<unknown>;
}

export class PrismaWorkEvidenceRepository implements WorkEvidenceRepositoryPort {
  public constructor(
    private readonly gateway: WorkEvidenceGateway,
    private readonly sourceGateway: WorkEvidenceSourceGateway,
  ) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<WorkEvidence | null> {
    const record = await this.gateway.findFirst({ where: { id }, include: { workEvidenceSource: true } });
    return record ? WorkEvidencePrismaMapper.toDomain(record) : null;
  }

  public async findByProjectId(projectId: string, asOf: Date): Promise<WorkEvidence[]> {
    const records = await this.gateway.findMany({
      where: {
        projectId,
        recordedAt: { lte: asOf },
      },
      include: { workEvidenceSource: true },
    });
    return records.map((record) => WorkEvidencePrismaMapper.toDomain(record));
  }

  public async list(query: {
    dateFrom?: Date;
    dateTo?: Date;
    personId?: string;
    projectId?: string;
    sourceType?: string;
  }): Promise<WorkEvidence[]> {
    const records = await this.gateway.findMany({
      where: {
        personId: query.personId,
        projectId: query.projectId,
        recordedAt: {
          gte: query.dateFrom,
          lte: query.dateTo,
        },
        workEvidenceSource: query.sourceType
          ? {
              sourceType: query.sourceType,
            }
          : undefined,
      },
      include: { workEvidenceSource: true },
    });

    return records.map((record) => WorkEvidencePrismaMapper.toDomain(record));
  }

  public async findByWorkEvidenceId(workEvidenceId: WorkEvidenceId): Promise<WorkEvidence | null> {
    return this.findById(workEvidenceId.value);
  }

  public async save(aggregate: WorkEvidence): Promise<void> {
    await this.sourceGateway.upsert({
      create: {
        archivedAt: aggregate.source.archivedAt ?? null,
        connectionKey: aggregate.source.connectionKey ?? null,
        displayName: aggregate.source.displayName,
        id: aggregate.source.id,
        provider: aggregate.source.provider,
        sourceType: aggregate.source.sourceType,
      },
      update: {
        archivedAt: aggregate.source.archivedAt ?? null,
        connectionKey: aggregate.source.connectionKey ?? null,
        displayName: aggregate.source.displayName,
        provider: aggregate.source.provider,
        sourceType: aggregate.source.sourceType,
      },
      where: { id: aggregate.source.id },
    });

    await this.gateway.upsert({
      create: {
        details: aggregate.details ?? null,
        durationMinutes: aggregate.durationMinutes ?? null,
        evidenceType: aggregate.evidenceType,
        id: aggregate.id,
        occurredOn: aggregate.occurredOn ?? null,
        personId: aggregate.personId ?? null,
        projectId: aggregate.projectId ?? null,
        recordedAt: aggregate.recordedAt,
        sourceRecordKey: aggregate.sourceRecordKey,
        summary: aggregate.summary ?? null,
        trace: aggregate.trace ?? null,
        workEvidenceSourceId: aggregate.source.id,
      },
      update: {
        details: aggregate.details ?? null,
        durationMinutes: aggregate.durationMinutes ?? null,
        evidenceType: aggregate.evidenceType,
        occurredOn: aggregate.occurredOn ?? null,
        personId: aggregate.personId ?? null,
        projectId: aggregate.projectId ?? null,
        recordedAt: aggregate.recordedAt,
        sourceRecordKey: aggregate.sourceRecordKey,
        summary: aggregate.summary ?? null,
        trace: aggregate.trace ?? null,
        workEvidenceSourceId: aggregate.source.id,
      },
      where: { id: aggregate.id },
    });
  }
}
