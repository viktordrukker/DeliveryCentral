import { Injectable, Optional } from '@nestjs/common';

import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { InMemoryM365DirectoryReconciliationRecordRepository } from '@src/modules/integrations/m365/infrastructure/repositories/in-memory/in-memory-m365-directory-reconciliation-record.repository';
import { M365DirectoryReconciliationRecord } from '@src/modules/integrations/m365/domain/entities/m365-directory-reconciliation-record.entity';
import { InMemoryRadiusReconciliationRecordRepository } from '@src/modules/integrations/radius/infrastructure/repositories/in-memory/in-memory-radius-reconciliation-record.repository';
import { RadiusReconciliationRecord } from '@src/modules/integrations/radius/domain/entities/radius-reconciliation-record.entity';
import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { AppConfig } from '@src/shared/config/app-config';

import { ExceptionResolutionStore } from '../domain/exception-resolution.store';
import {
  ExceptionQueueCategory,
  ExceptionQueueItemDto,
  ExceptionQueueResponseDto,
  ExceptionQueueStatus,
} from './contracts/exception-queue.dto';

interface ExceptionQueueQuery {
  asOf?: string;
  category?: ExceptionQueueCategory;
  limit?: number;
  provider?: 'm365' | 'radius';
  status?: ExceptionQueueStatus;
  targetEntityId?: string;
  targetEntityType?: string;
}

@Injectable()
export class ExceptionQueueQueryService {
  private readonly personNameCache = new Map<string, string | undefined>();
  private readonly projectNameCache = new Map<string, string | undefined>();

  public constructor(
    private readonly projectAssignmentRepository: InMemoryProjectAssignmentRepository,
    private readonly workEvidenceRepository: InMemoryWorkEvidenceRepository,
    private readonly projectRepository: InMemoryProjectRepository,
    private readonly personRepository: InMemoryPersonRepository,
    private readonly m365ReconciliationRecordRepository: InMemoryM365DirectoryReconciliationRecordRepository,
    private readonly radiusReconciliationRecordRepository: InMemoryRadiusReconciliationRecordRepository,
    private readonly appConfig: AppConfig,
    @Optional() private readonly resolutionStore: ExceptionResolutionStore | null = null,
  ) {}

  public async getQueue(query: ExceptionQueueQuery = {}): Promise<ExceptionQueueResponseDto> {
    const asOf = this.resolveAsOf(query.asOf);

    const [
      assignments,
      workEvidence,
      projects,
      m365Records,
      radiusRecords,
    ] = await Promise.all([
      this.projectAssignmentRepository.findAll(),
      this.workEvidenceRepository.list({ dateTo: asOf }),
      this.projectRepository.findAll(),
      this.m365ReconciliationRecordRepository.listByProvider('m365'),
      this.radiusReconciliationRecordRepository.listByProvider('radius'),
    ]);

    const items = [
      ...(await this.buildAssignmentWithoutEvidence(assignments, workEvidence, asOf)),
      ...(await this.buildWorkEvidenceWithoutAssignment(assignments, workEvidence, asOf)),
      ...(await this.buildWorkEvidenceAfterAssignmentEnd(assignments, workEvidence, asOf)),
      ...(await this.buildProjectClosureConflicts(projects, assignments, asOf)),
      ...this.buildStaleApprovals(assignments, asOf),
      ...this.buildM365ReconciliationExceptions(m365Records),
      ...this.buildRadiusReconciliationExceptions(radiusRecords),
    ];

    const statusFilter = query.status ?? 'OPEN';

    const enrichedItems: ExceptionQueueItemDto[] = items.map((item) => {
      if (this.resolutionStore !== null) {
        const resolution = this.resolutionStore.getById(item.id);
        if (resolution) {
          return { ...item, status: resolution.status };
        }
      }
      return item;
    });

    const filtered = enrichedItems
      .filter((item) => !query.category || item.category === query.category)
      .filter((item) => !query.provider || item.provider === query.provider)
      .filter((item) => item.status === statusFilter)
      .filter((item) => !query.targetEntityType || item.targetEntityType === query.targetEntityType)
      .filter((item) => !query.targetEntityId || item.targetEntityId === query.targetEntityId)
      .sort((left, right) => right.observedAt.localeCompare(left.observedAt));

    const boundedLimit = Math.min(Math.max(query.limit ?? 100, 1), 250);
    const visibleItems = filtered.slice(0, boundedLimit);

    return {
      asOf: asOf.toISOString(),
      items: visibleItems,
      summary: {
        byCategory: visibleItems.reduce<Partial<Record<ExceptionQueueCategory, number>>>(
          (aggregate, item) => {
            aggregate[item.category] = (aggregate[item.category] ?? 0) + 1;
            return aggregate;
          },
          {},
        ),
        open: visibleItems.length,
        total: visibleItems.length,
      },
    };
  }

  public async getById(
    id: string,
    query: Omit<ExceptionQueueQuery, 'limit'> = {},
  ): Promise<ExceptionQueueItemDto | null> {
    const queue = await this.getQueue(query);
    return queue.items.find((item) => item.id === id) ?? null;
  }

  private resolveAsOf(value?: string): Date {
    const asOf = value ? new Date(value) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new Error('Exceptions asOf is invalid.');
    }

    return asOf;
  }

  private async buildAssignmentWithoutEvidence(
    assignments: ProjectAssignment[],
    workEvidence: WorkEvidence[],
    asOf: Date,
  ): Promise<ExceptionQueueItemDto[]> {
    const activeAssignments = assignments.filter((assignment) => assignment.isActiveAt(asOf));

    const items: ExceptionQueueItemDto[] = [];

    for (const assignment of activeAssignments) {
      const hasEvidence = workEvidence.some(
        (item) => item.personId === assignment.personId && item.projectId === assignment.projectId,
      );

      if (hasEvidence) {
        continue;
      }

      items.push({
        assignmentId: assignment.assignmentId.value,
        category: 'ASSIGNMENT_WITHOUT_EVIDENCE',
        details: {
          allocationPercent: assignment.allocationPercent?.value ?? 0,
          staffingRole: assignment.staffingRole,
          validFrom: assignment.validFrom.toISOString(),
          validTo: assignment.validTo?.toISOString(),
        },
        id: `assignment-without-evidence:${assignment.assignmentId.value}`,
        observedAt: assignment.approvedAt?.toISOString() ?? assignment.requestedAt.toISOString(),
        personDisplayName: await this.readPersonDisplayName(assignment.personId),
        personId: assignment.personId,
        projectId: assignment.projectId,
        projectName: await this.readProjectName(assignment.projectId),
        sourceContext: 'assignment',
        status: 'OPEN',
        summary: `Assignment has no observed work evidence for ${await this.readPersonDisplayName(assignment.personId) ?? assignment.personId}.`,
        targetEntityId: assignment.assignmentId.value,
        targetEntityType: 'ASSIGNMENT',
      });
    }

    return items;
  }

  private async buildWorkEvidenceWithoutAssignment(
    assignments: ProjectAssignment[],
    workEvidence: WorkEvidence[],
    asOf: Date,
  ): Promise<ExceptionQueueItemDto[]> {
    const activeAssignments = assignments.filter((assignment) => assignment.isActiveAt(asOf));

    const items: ExceptionQueueItemDto[] = [];

    for (const evidence of workEvidence) {
      if (!evidence.personId || !evidence.projectId) {
        continue;
      }

      const hasAssignment = activeAssignments.some(
        (assignment) =>
          assignment.personId === evidence.personId && assignment.projectId === evidence.projectId,
      );

      if (hasAssignment) {
        continue;
      }

      items.push({
        category: 'WORK_EVIDENCE_WITHOUT_ASSIGNMENT',
        details: {
          evidenceType: evidence.evidenceType,
          sourceType: evidence.source.sourceType,
          sourceRecordKey: evidence.sourceRecordKey,
        },
        id: `work-evidence-without-assignment:${evidence.workEvidenceId.value}`,
        observedAt: evidence.recordedAt.toISOString(),
        personDisplayName: await this.readPersonDisplayName(evidence.personId),
        personId: evidence.personId,
        projectId: evidence.projectId,
        projectName: await this.readProjectName(evidence.projectId),
        sourceContext: 'work_evidence',
        status: 'OPEN',
        summary: `Observed work has no matching active assignment for ${await this.readPersonDisplayName(evidence.personId) ?? evidence.personId}.`,
        targetEntityId: evidence.workEvidenceId.value,
        targetEntityType: 'WORK_EVIDENCE',
        workEvidenceId: evidence.workEvidenceId.value,
      });
    }

    return items;
  }

  private async buildWorkEvidenceAfterAssignmentEnd(
    assignments: ProjectAssignment[],
    workEvidence: WorkEvidence[],
    asOf: Date,
  ): Promise<ExceptionQueueItemDto[]> {
    const inactiveAssignments = assignments.filter(
      (assignment) => assignment.validTo && assignment.validTo < asOf,
    );

    const items: ExceptionQueueItemDto[] = [];

    for (const evidence of workEvidence) {
      if (!evidence.personId || !evidence.projectId) {
        continue;
      }

      const endedAssignment = inactiveAssignments.find(
        (assignment) =>
          assignment.personId === evidence.personId &&
          assignment.projectId === evidence.projectId &&
          Boolean(assignment.validTo && evidence.recordedAt > assignment.validTo),
      );

      if (!endedAssignment) {
        continue;
      }

      items.push({
        assignmentId: endedAssignment.assignmentId.value,
        category: 'WORK_EVIDENCE_AFTER_ASSIGNMENT_END',
        details: {
          assignmentEndedAt: endedAssignment.validTo?.toISOString(),
          evidenceType: evidence.evidenceType,
          sourceType: evidence.source.sourceType,
        },
        id: `work-evidence-after-assignment-end:${evidence.workEvidenceId.value}`,
        observedAt: evidence.recordedAt.toISOString(),
        personDisplayName: await this.readPersonDisplayName(evidence.personId),
        personId: evidence.personId,
        projectId: evidence.projectId,
        projectName: await this.readProjectName(evidence.projectId),
        sourceContext: 'work_evidence',
        status: 'OPEN',
        summary: `Observed work was recorded after the assignment ended for ${await this.readPersonDisplayName(evidence.personId) ?? evidence.personId}.`,
        targetEntityId: evidence.workEvidenceId.value,
        targetEntityType: 'WORK_EVIDENCE',
        workEvidenceId: evidence.workEvidenceId.value,
      });
    }

    return items;
  }

  private async buildProjectClosureConflicts(
    projects: Array<{ projectId: { value: string }; status: string; name: string }>,
    assignments: ProjectAssignment[],
    asOf: Date,
  ): Promise<ExceptionQueueItemDto[]> {
    const items: ExceptionQueueItemDto[] = [];

    for (const project of projects.filter((item) => item.status === 'CLOSED')) {
      const activeAssignments = assignments.filter(
        (assignment) => assignment.projectId === project.projectId.value && assignment.isActiveAt(asOf),
      );

      if (activeAssignments.length === 0) {
        continue;
      }

      items.push({
        category: 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS',
        details: {
          activeAssignmentCount: activeAssignments.length,
          activeAssignmentIds: activeAssignments.map((assignment) => assignment.assignmentId.value),
        },
        id: `project-closure-with-active-assignments:${project.projectId.value}`,
        observedAt: asOf.toISOString(),
        projectId: project.projectId.value,
        projectName: project.name,
        sourceContext: 'project',
        status: 'OPEN',
        summary: `Closed project ${project.name} still has ${activeAssignments.length} active assignment${activeAssignments.length === 1 ? '' : 's'}.`,
        targetEntityId: project.projectId.value,
        targetEntityType: 'PROJECT',
      });
    }

    return items;
  }

  private buildStaleApprovals(
    assignments: ProjectAssignment[],
    asOf: Date,
  ): ExceptionQueueItemDto[] {
    const thresholdMs = this.appConfig.exceptionsStaleApprovalDays * 24 * 60 * 60 * 1000;

    return assignments
      .filter((assignment) => assignment.status.value === 'REQUESTED')
      .filter((assignment) => asOf.getTime() - assignment.requestedAt.getTime() >= thresholdMs)
      .map((assignment) => ({
        assignmentId: assignment.assignmentId.value,
        category: 'STALE_ASSIGNMENT_APPROVAL',
        details: {
          requestedAt: assignment.requestedAt.toISOString(),
          staleDays: Math.floor((asOf.getTime() - assignment.requestedAt.getTime()) / (24 * 60 * 60 * 1000)),
        },
        id: `stale-assignment-approval:${assignment.assignmentId.value}`,
        observedAt: assignment.requestedAt.toISOString(),
        personId: assignment.personId,
        projectId: assignment.projectId,
        sourceContext: 'assignment',
        status: 'OPEN',
        summary: `Assignment approval request has been stale since ${assignment.requestedAt.toISOString()}.`,
        targetEntityId: assignment.assignmentId.value,
        targetEntityType: 'ASSIGNMENT',
      }));
  }

  private buildM365ReconciliationExceptions(
    records: M365DirectoryReconciliationRecord[],
  ): ExceptionQueueItemDto[] {
    return records
      .filter((record) => record.category !== 'MATCHED')
      .map((record) => ({
        category: 'M365_RECONCILIATION_ANOMALY',
        details: {
          candidatePersonIds: record.candidatePersonIds,
          reconciliationCategory: record.category,
        },
        id: `m365-reconciliation-anomaly:${record.id}`,
        observedAt: record.lastEvaluatedAt.toISOString(),
        personId: record.personId,
        provider: 'm365',
        sourceContext: 'integration',
        status: 'OPEN',
        summary: record.summary,
        targetEntityId: record.externalUserId,
        targetEntityType: 'EXTERNAL_IDENTITY',
      }));
  }

  private buildRadiusReconciliationExceptions(
    records: RadiusReconciliationRecord[],
  ): ExceptionQueueItemDto[] {
    return records
      .filter((record) => record.category !== 'MATCHED')
      .map((record) => ({
        category: 'RADIUS_RECONCILIATION_ANOMALY',
        details: {
          accountPresenceState: record.accountPresenceState,
          candidatePersonIds: record.candidatePersonIds,
          reconciliationCategory: record.category,
          sourceType: record.sourceType,
        },
        id: `radius-reconciliation-anomaly:${record.id}`,
        observedAt: record.lastEvaluatedAt.toISOString(),
        personId: record.personId,
        provider: 'radius',
        sourceContext: 'integration',
        status: 'OPEN',
        summary: record.summary,
        targetEntityId: record.externalAccountId,
        targetEntityType: 'EXTERNAL_ACCOUNT',
      }));
  }

  private async readPersonDisplayName(personId: string): Promise<string | undefined> {
    if (!this.personNameCache.has(personId)) {
      const person = await this.personRepository.findByPersonId(PersonId.from(personId));
      this.personNameCache.set(personId, person?.displayName);
    }

    return this.personNameCache.get(personId);
  }

  private async readProjectName(projectId: string): Promise<string | undefined> {
    if (!this.projectNameCache.has(projectId)) {
      const project = await this.projectRepository.findById(projectId);
      this.projectNameCache.set(projectId, project?.name);
    }

    return this.projectNameCache.get(projectId);
  }
}

