import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { CaseRecord } from '../domain/entities/case-record.entity';
import { CaseResponseDto } from './contracts/case.response';

interface PersonNameRow {
  id: string;
  displayName: string;
}

/**
 * F-28 / 20c-07 — extracted from `cases.controller.ts`.
 *
 * The controller previously carried two private helpers
 * (`loadPeopleMap` + `mapCase`) used by 9 endpoints to project a
 * `CaseRecord` into the wire-shape `CaseResponseDto` with subject +
 * owner display names attached.
 *
 * The work isn't HTTP-specific: it joins person data and shapes the
 * presentation DTO. Moving it into the application layer keeps the
 * controller thin (HTTP orchestration only) and lets future
 * consumers (BI export, webhook payload builders, alternate
 * transports) reuse the same projection.
 */
@Injectable()
export class CasePresenterService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Single-case path. Loads the people lookup map and maps the
   * record. Use this when only one CaseRecord needs to be presented.
   */
  public async presentSingle(caseRecord: CaseRecord): Promise<CaseResponseDto> {
    const peopleMap = await this.loadPeopleMap();
    const positionRoleMap = await this.loadPositionRoleMap([caseRecord]);
    return this.mapCase(caseRecord, peopleMap, positionRoleMap);
  }

  /**
   * Batch path. Loads the people lookup map once and maps every
   * record against it. Use this for list endpoints to avoid the
   * obvious N+1.
   */
  public async presentMany(caseRecords: CaseRecord[]): Promise<CaseResponseDto[]> {
    if (caseRecords.length === 0) return [];
    const peopleMap = await this.loadPeopleMap();
    const positionRoleMap = await this.loadPositionRoleMap(caseRecords);
    return caseRecords.map((record) => this.mapCase(record, peopleMap, positionRoleMap));
  }

  private async loadPeopleMap(): Promise<Map<string, PersonNameRow>> {
    const dbPeople = await this.prisma.person.findMany({
      select: { id: true, displayName: true },
    });
    return new Map(dbPeople.map((p) => [p.id, p]));
  }

  // SC-7 — resolve related-position ids to their role so the "Related Position"
  // link shows a label instead of a UUID. Loads only the referenced positions.
  private async loadPositionRoleMap(
    caseRecords: CaseRecord[],
  ): Promise<Map<string, string>> {
    const ids = [
      ...new Set(
        caseRecords
          .map((c) => c.relatedAssignmentId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (ids.length === 0) return new Map();
    const positions = await this.prisma.projectPosition.findMany({
      where: { id: { in: ids } },
      select: { id: true, role: true },
    });
    return new Map(positions.map((p) => [p.id, p.role]));
  }

  private mapCase(
    caseRecord: CaseRecord,
    allPeopleById: Map<string, PersonNameRow>,
    positionRoleById: Map<string, string>,
  ): CaseResponseDto {
    const subjectPerson = allPeopleById.get(caseRecord.subjectPersonId);
    const ownerPerson = allPeopleById.get(caseRecord.ownerPersonId);

    return {
      cancelReason: caseRecord.cancelReason,
      caseNumber: caseRecord.caseNumber,
      caseTypeDisplayName: caseRecord.caseType.displayName,
      caseTypeKey: caseRecord.caseType.key,
      closedAt: caseRecord.closedAt?.toISOString(),
      id: caseRecord.caseId.value,
      openedAt: caseRecord.openedAt.toISOString(),
      ownerPersonId: caseRecord.ownerPersonId,
      ownerPersonName: ownerPerson?.displayName,
      participants: caseRecord.participants.map((participant) => ({
        personId: participant.personId,
        role: participant.role,
        // SC-7 — resolve from the same map (no extra query).
        personName: allPeopleById.get(participant.personId)?.displayName,
      })),
      relatedAssignmentId: caseRecord.relatedAssignmentId,
      relatedAssignmentRole: caseRecord.relatedAssignmentId
        ? positionRoleById.get(caseRecord.relatedAssignmentId)
        : undefined,
      relatedProjectId: caseRecord.relatedProjectId,
      status: caseRecord.status,
      subjectPersonId: caseRecord.subjectPersonId,
      subjectPersonName: subjectPerson?.displayName,
      summary: caseRecord.summary,
    };
  }
}
