import { AssignmentApproval } from '@src/modules/assignments/domain/entities/assignment-approval.entity';
import { AssignmentHistory } from '@src/modules/assignments/domain/entities/assignment-history.entity';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '@src/modules/assignments/domain/repositories/project-assignment-repository.port';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';
import { AssignmentConcurrencyConflictError } from '@src/modules/assignments/application/assignment-concurrency-conflict.error';
import { TransactionContext } from '@src/shared/domain/transaction-context';

import { AssignmentsPrismaMapper } from './assignments-prisma.mapper';

interface AssignmentGateway {
  create(args: any): Promise<unknown>;
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  updateMany(args: any): Promise<{ count: number }>;
}

interface AssignmentApprovalGateway {
  create(args: any): Promise<unknown>;
  findMany(args?: any): Promise<any[]>;
}

interface AssignmentHistoryGateway {
  create(args: any): Promise<unknown>;
  findMany(args?: any): Promise<any[]>;
}

interface TxClientWithAssignmentTables {
  projectAssignment?: AssignmentGateway;
  assignmentApproval?: AssignmentApprovalGateway;
  assignmentHistory?: AssignmentHistoryGateway;
}

export class PrismaProjectAssignmentRepository implements ProjectAssignmentRepositoryPort {
  public constructor(
    private readonly gateway: AssignmentGateway,
    private readonly approvalGateway?: AssignmentApprovalGateway,
    private readonly historyGateway?: AssignmentHistoryGateway,
  ) {}

  /**
   * When an external `tx` (Prisma `$transaction` client) is supplied,
   * swap to its delegate so writes join the caller's atomic unit.
   * Falls back to the constructor-injected gateway otherwise.
   */
  private resolveAssignmentGateway(tx?: TransactionContext): AssignmentGateway {
    if (tx && typeof tx === 'object' && tx !== null && 'projectAssignment' in tx) {
      const fromTx = (tx as TxClientWithAssignmentTables).projectAssignment;
      if (fromTx) return fromTx;
    }
    return this.gateway;
  }

  private resolveApprovalGateway(tx?: TransactionContext): AssignmentApprovalGateway | undefined {
    if (tx && typeof tx === 'object' && tx !== null && 'assignmentApproval' in tx) {
      const fromTx = (tx as TxClientWithAssignmentTables).assignmentApproval;
      if (fromTx) return fromTx;
    }
    return this.approvalGateway;
  }

  private resolveHistoryGateway(tx?: TransactionContext): AssignmentHistoryGateway | undefined {
    if (tx && typeof tx === 'object' && tx !== null && 'assignmentHistory' in tx) {
      const fromTx = (tx as TxClientWithAssignmentTables).assignmentHistory;
      if (fromTx) return fromTx;
    }
    return this.historyGateway;
  }

  public async delete(id: string, tx?: TransactionContext): Promise<void> {
    try {
      await this.resolveAssignmentGateway(tx).delete({ where: { id } });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2003') {
        throw new Error('Cannot delete assignment: it has linked approval or history records. Archive it instead.');
      }
      throw error;
    }
  }

  public async appendApproval(approval: AssignmentApproval, tx?: TransactionContext): Promise<void> {
    const gateway = this.resolveApprovalGateway(tx);
    if (!gateway) {
      throw new Error('Prisma assignment approval gateway is not configured.');
    }

    await gateway.create({
      data: {
        assignmentId: approval.assignmentId.value,
        decision: approval.decisionState.value,
        decisionAt: approval.decisionAt ?? null,
        decisionReason: approval.decisionReason ?? null,
        decidedByPersonId: approval.decidedByPersonId ?? null,
        id: approval.id,
        sequenceNumber: approval.sequenceNumber,
      },
    });
  }

  public async appendHistory(historyEntry: AssignmentHistory, tx?: TransactionContext): Promise<void> {
    const gateway = this.resolveHistoryGateway(tx);
    if (!gateway) {
      throw new Error('Prisma assignment history gateway is not configured.');
    }

    await gateway.create({
      data: {
        assignmentId: historyEntry.assignmentId.value,
        changeReason: historyEntry.changeReason ?? null,
        changeType: historyEntry.changeType,
        changedByPersonId: historyEntry.changedByPersonId ?? null,
        id: historyEntry.id,
        newSnapshot: historyEntry.newSnapshot ?? null,
        occurredAt: historyEntry.occurredAt,
        previousSnapshot: historyEntry.previousSnapshot ?? null,
      },
    });
  }

  public async findAll(): Promise<ProjectAssignment[]> {
    const records = await this.gateway.findMany({});
    return records.map((record) => AssignmentsPrismaMapper.toDomainAssignment(record));
  }

  public async findByQuery(query: {
    personId?: string;
    projectId?: string;
    statuses?: string[];
  }): Promise<ProjectAssignment[]> {
    const records = await this.gateway.findMany({
      where: {
        ...(query.personId ? { personId: query.personId } : {}),
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.statuses?.length
          ? {
              status: {
                in: query.statuses,
              },
            }
          : {}),
      },
    });

    return records.map((record) => AssignmentsPrismaMapper.toDomainAssignment(record));
  }

  public async findActiveByProjectId(projectId: string, asOf: Date): Promise<ProjectAssignment[]> {
    const records = await this.gateway.findMany({
      where: {
        projectId,
        status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        validFrom: { lte: asOf },
        OR: [{ validTo: null }, { validTo: { gte: asOf } }],
      },
    });

    return records.map((record) => AssignmentsPrismaMapper.toDomainAssignment(record));
  }

  public async findApprovalsByAssignmentId(
    assignmentId: AssignmentId,
  ): Promise<AssignmentApproval[]> {
    if (!this.approvalGateway) {
      throw new Error('Prisma assignment approval gateway is not configured.');
    }

    const records = await this.approvalGateway.findMany({
      orderBy: { sequenceNumber: 'asc' },
      where: { assignmentId: assignmentId.value },
    });

    return records.map((record) => AssignmentsPrismaMapper.toDomainApproval(record));
  }

  public async findByAssignmentId(assignmentId: AssignmentId): Promise<ProjectAssignment | null> {
    const record = await this.gateway.findFirst({ where: { id: assignmentId.value } });
    return record ? AssignmentsPrismaMapper.toDomainAssignment(record) : null;
  }

  public async findById(id: string): Promise<ProjectAssignment | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? AssignmentsPrismaMapper.toDomainAssignment(record) : null;
  }

  public async findHistoryByAssignmentId(
    assignmentId: AssignmentId,
  ): Promise<AssignmentHistory[]> {
    if (!this.historyGateway) {
      throw new Error('Prisma assignment history gateway is not configured.');
    }

    const records = await this.historyGateway.findMany({
      orderBy: { occurredAt: 'asc' },
      where: { assignmentId: assignmentId.value },
    });

    return records.map((record) => AssignmentsPrismaMapper.toDomainHistory(record));
  }

  public async findInactiveByProjectId(projectId: string, asOf: Date): Promise<ProjectAssignment[]> {
    const records = await this.gateway.findMany({
      where: {
        projectId,
        OR: [
          { status: { notIn: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] } },
          { validTo: { lt: asOf } },
        ],
      },
    });

    return records.map((record) => AssignmentsPrismaMapper.toDomainAssignment(record));
  }

  public async findOverlappingByPersonAndProject(
    personId: string,
    projectId: string,
    start: Date,
    end?: Date,
  ): Promise<ProjectAssignment[]> {
    const records = await this.gateway.findMany({
      where: {
        personId,
        projectId,
        status: { in: ['CREATED', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        validFrom: { lte: end ?? start },
        OR: [{ validTo: null }, { validTo: { gte: start } }],
      },
    });

    return records.map((record) => AssignmentsPrismaMapper.toDomainAssignment(record));
  }

  public async save(aggregate: ProjectAssignment, tx?: TransactionContext): Promise<void> {
    const gateway = this.resolveAssignmentGateway(tx);
    const persisted = await gateway.findFirst({ where: { id: aggregate.id } });

    if (!persisted) {
      aggregate.synchronizeVersion(1);
      await gateway.create({
        data: {
          allocationPercent: aggregate.allocationPercent?.value ?? null,
          approvedAt: aggregate.approvedAt ?? null,
          archivedAt: aggregate.archivedAt ?? null,
          cancellationReason: aggregate.cancellationReason ?? null,
          id: aggregate.id,
          notes: aggregate.notes ?? null,
          onboardingDate: aggregate.onboardingDate ?? null,
          onHoldCaseId: aggregate.onHoldCaseId ?? null,
          onHoldReason: aggregate.onHoldReason ?? null,
          personId: aggregate.personId,
          projectId: aggregate.projectId,
          rejectionReason: aggregate.rejectionReason ?? null,
          rejectionReasonCode: aggregate.rejectionReasonCode ?? null,
          requestedAt: aggregate.requestedAt,
          requestedByPersonId: aggregate.requestedByPersonId ?? null,
          requiresDirectorApproval: aggregate.requiresDirectorApproval,
          slaBreachedAt: aggregate.slaBreachedAt ?? null,
          slaDueAt: aggregate.slaDueAt ?? null,
          slaStage: aggregate.slaStage ?? null,
          staffingRequestId: aggregate.staffingRequestId ?? null,
          staffingRole: aggregate.staffingRole,
          status: aggregate.status.value,
          validFrom: aggregate.validFrom,
          validTo: aggregate.validTo ?? null,
          version: aggregate.version,
          // F-91 / D-103-write-path — populate actor-audit column added by F-44.
          createdByPersonId: aggregate.createdByPersonId ?? null,
          // F-118 / D-103-write-path round 28 — also populate updatedByPersonId
          // on first insert (matches the uniform "both cols on create" pattern).
          updatedByPersonId: aggregate.updatedByPersonId ?? aggregate.createdByPersonId ?? null,
        },
      });
      return;
    }

    const nextVersion = aggregate.version + 1;
    const result = await gateway.updateMany({
      data: {
        allocationPercent: aggregate.allocationPercent?.value ?? null,
        approvedAt: aggregate.approvedAt ?? null,
        archivedAt: aggregate.archivedAt ?? null,
        cancellationReason: aggregate.cancellationReason ?? null,
        notes: aggregate.notes ?? null,
        onboardingDate: aggregate.onboardingDate ?? null,
        onHoldCaseId: aggregate.onHoldCaseId ?? null,
        onHoldReason: aggregate.onHoldReason ?? null,
        personId: aggregate.personId,
        projectId: aggregate.projectId,
        rejectionReason: aggregate.rejectionReason ?? null,
        rejectionReasonCode: aggregate.rejectionReasonCode ?? null,
        requestedAt: aggregate.requestedAt,
        requestedByPersonId: aggregate.requestedByPersonId ?? null,
        requiresDirectorApproval: aggregate.requiresDirectorApproval,
        slaBreachedAt: aggregate.slaBreachedAt ?? null,
        slaDueAt: aggregate.slaDueAt ?? null,
        slaStage: aggregate.slaStage ?? null,
        staffingRequestId: aggregate.staffingRequestId ?? null,
        staffingRole: aggregate.staffingRole,
        status: aggregate.status.value,
        validFrom: aggregate.validFrom,
        validTo: aggregate.validTo ?? null,
        version: nextVersion,
        // F-118 / D-103-write-path round 28 — track the editor on every update.
        updatedByPersonId: aggregate.updatedByPersonId ?? null,
      },
      where: {
        id: aggregate.id,
        version: aggregate.version,
      },
    });

    if (result.count === 0) {
      throw new AssignmentConcurrencyConflictError();
    }

    aggregate.synchronizeVersion(nextVersion);
  }
}
