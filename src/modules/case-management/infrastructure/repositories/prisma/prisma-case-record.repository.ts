import { PrismaService } from '@src/shared/persistence/prisma.service';
import { CaseRecord } from '@src/modules/case-management/domain/entities/case-record.entity';
import { CaseRecordRepositoryPort } from '@src/modules/case-management/domain/repositories/case-record-repository.port';
import { CaseId } from '@src/modules/case-management/domain/value-objects/case-id';

import { CaseManagementPrismaMapper } from './case-management-prisma.mapper';

export class PrismaCaseRecordRepository implements CaseRecordRepositoryPort {
  public constructor(private readonly prisma: PrismaService) {}

  public async count(): Promise<number> {
    return this.prisma.caseRecord.count();
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.caseRecord.delete({ where: { id } });
  }

  public async findByCaseId(caseId: CaseId): Promise<CaseRecord | null> {
    const record = await this.prisma.caseRecord.findFirst({
      where: { id: caseId.value },
      include: { caseType: true, participants: true },
    });

    return record
      ? CaseManagementPrismaMapper.toDomain(
          record as unknown as Parameters<typeof CaseManagementPrismaMapper.toDomain>[0],
        )
      : null;
  }

  public async findById(id: string): Promise<CaseRecord | null> {
    return this.findByCaseId(CaseId.from(id));
  }

  public async list(query: {
    caseTypeKey?: string;
    ownerPersonId?: string;
    subjectPersonId?: string;
  }): Promise<CaseRecord[]> {
    const records = await this.prisma.caseRecord.findMany({
      where: {
        caseType: query.caseTypeKey ? { key: query.caseTypeKey } : undefined,
        ownerPersonId: query.ownerPersonId,
        subjectPersonId: query.subjectPersonId,
      },
      include: { caseType: true, participants: true },
    });

    return records.map((record) =>
      CaseManagementPrismaMapper.toDomain(
        record as unknown as Parameters<typeof CaseManagementPrismaMapper.toDomain>[0],
      ),
    );
  }

  public async save(aggregate: CaseRecord): Promise<void> {
    const caseTypeRecord = await this.prisma.caseType.findFirst({
      where: { key: aggregate.caseType.key },
    });

    if (!caseTypeRecord) {
      throw new Error(`Case type ${aggregate.caseType.key} is not configured.`);
    }

    await this.prisma.caseRecord.upsert({
      create: {
        caseNumber: aggregate.caseNumber,
        caseTypeId: caseTypeRecord.id,
        id: aggregate.id,
        openedAt: aggregate.openedAt,
        ownerPersonId: aggregate.ownerPersonId,
        participants: {
          create: aggregate.participants.map((participant) => ({
            id: participant.id,
            personId: participant.personId,
            role: participant.role,
          })),
        },
        relatedAssignmentId: aggregate.relatedAssignmentId ?? null,
        relatedProjectId: aggregate.relatedProjectId ?? null,
        status: aggregate.status,
        subjectPersonId: aggregate.subjectPersonId,
        summary: aggregate.summary ?? null,
      },
      update: {
        caseNumber: aggregate.caseNumber,
        caseTypeId: caseTypeRecord.id,
        openedAt: aggregate.openedAt,
        ownerPersonId: aggregate.ownerPersonId,
        participants: {
          createMany: {
            data: aggregate.participants.map((participant) => ({
              caseRecordId: aggregate.id,
              id: participant.id,
              personId: participant.personId,
              role: participant.role,
            })),
            skipDuplicates: true,
          },
        },
        relatedAssignmentId: aggregate.relatedAssignmentId ?? null,
        relatedProjectId: aggregate.relatedProjectId ?? null,
        status: aggregate.status,
        subjectPersonId: aggregate.subjectPersonId,
        summary: aggregate.summary ?? null,
      },
      where: { id: aggregate.id },
    });
  }
}
