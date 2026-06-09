import { PrismaService } from '@src/shared/persistence/prisma.service';
import { CaseRecord } from '@src/modules/case-management/domain/entities/case-record.entity';
import { CaseRecordRepositoryPort } from '@src/modules/case-management/domain/repositories/case-record-repository.port';
import { CaseId } from '@src/modules/case-management/domain/value-objects/case-id';

import {
  CaseManagementPrismaMapper,
  CASE_RECORD_MAPPER_INCLUDE,
} from './case-management-prisma.mapper';

export class PrismaCaseRecordRepository implements CaseRecordRepositoryPort {
  public constructor(private readonly prisma: PrismaService) {}

  public async count(): Promise<number> {
    return this.prisma.caseRecord.count();
  }

  public async delete(id: string): Promise<void> {
    try {
      await this.prisma.caseRecord.delete({ where: { id } });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2003') {
        throw new Error('Cannot delete case: it has linked steps or participants. Archive it instead.');
      }
      throw error;
    }
  }

  public async findByCaseId(caseId: CaseId): Promise<CaseRecord | null> {
    const record = await this.prisma.caseRecord.findFirst({
      where: { id: caseId.value },
      include: CASE_RECORD_MAPPER_INCLUDE,
    });

    return record ? CaseManagementPrismaMapper.toDomain(record) : null;
  }

  public async findById(id: string): Promise<CaseRecord | null> {
    return this.findByCaseId(CaseId.from(id));
  }

  public async list(query: {
    caseTypeKey?: string;
    ownerPersonId?: string;
    projectId?: string;
    subjectPersonId?: string;
  }): Promise<CaseRecord[]> {
    // DM-4-2: CaseType.key is an enum at the DB level. Cast via `as any`
    // to keep the call signature `caseTypeKey?: string` in the domain
    // query while Prisma wants a CaseTypeKey enum value. Invalid values
    // throw a P2009 — same failure mode as before with a tighter type.
    // W2-02: relatedProjectId filter powers the project-scoped Cases tab.
    const records = await this.prisma.caseRecord.findMany({
      where: {
        caseType: query.caseTypeKey ? { key: query.caseTypeKey as never } : undefined,
        ownerPersonId: query.ownerPersonId,
        subjectPersonId: query.subjectPersonId,
        relatedProjectId: query.projectId,
      },
      include: CASE_RECORD_MAPPER_INCLUDE,
    });

    return records.map((record) => CaseManagementPrismaMapper.toDomain(record));
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
        // LEAN PR 16a/2 — `relatedAssignmentId` column is dropped by PR 16b.
        // The entity property remains for FE/spec compatibility but the
        // Prisma write no longer persists it to a dropped column.
        relatedProjectId: aggregate.relatedProjectId ?? null,
        status: aggregate.status,
        subjectPersonId: aggregate.subjectPersonId,
        summary: aggregate.summary ?? null,
        // F-93 / D-103-write-path — populate actor-audit col.
        createdByPersonId: aggregate.createdByPersonId ?? null,
        // F-130 / D-103-write-path round 40 — also populate updatedByPersonId
        // on first insert (defaults to createdByPersonId for new aggregates).
        updatedByPersonId:
          aggregate.updatedByPersonId ?? aggregate.createdByPersonId ?? null,
      },
      update: {
        caseNumber: aggregate.caseNumber,
        caseTypeId: caseTypeRecord.id,
        openedAt: aggregate.openedAt,
        ownerPersonId: aggregate.ownerPersonId,
        participants: {
          createMany: {
            // Prisma infers `caseRecordId` from the parent CaseRecord in this
            // nested update; passing it explicitly raises `Unknown argument`.
            data: aggregate.participants.map((participant) => ({
              id: participant.id,
              personId: participant.personId,
              role: participant.role,
            })),
            skipDuplicates: true,
          },
        },
        // LEAN PR 16a/2 — `relatedAssignmentId` column dropped by PR 16b.
        relatedProjectId: aggregate.relatedProjectId ?? null,
        status: aggregate.status,
        subjectPersonId: aggregate.subjectPersonId,
        summary: aggregate.summary ?? null,
        // F-130 / D-103-write-path round 40 — track editor on every update.
        updatedByPersonId: aggregate.updatedByPersonId ?? null,
      },
      where: { id: aggregate.id },
    });
  }
}
