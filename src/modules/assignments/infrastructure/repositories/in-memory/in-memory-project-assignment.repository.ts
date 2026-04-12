import { AssignmentApproval } from '@src/modules/assignments/domain/entities/assignment-approval.entity';
import { AssignmentHistory } from '@src/modules/assignments/domain/entities/assignment-history.entity';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '@src/modules/assignments/domain/repositories/project-assignment-repository.port';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';
import { AssignmentConcurrencyConflictError } from '@src/modules/assignments/application/assignment-concurrency-conflict.error';

export class InMemoryProjectAssignmentRepository implements ProjectAssignmentRepositoryPort {
  public constructor(
    private readonly assignments: ProjectAssignment[] = [],
    private readonly approvals: AssignmentApproval[] = [],
    private readonly historyEntries: AssignmentHistory[] = [],
  ) {}

  public async delete(id: string): Promise<void> {
    const index = this.assignments.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.assignments.splice(index, 1);
    }
  }

  public async appendApproval(approval: AssignmentApproval): Promise<void> {
    this.approvals.push(approval);
  }

  public async appendHistory(historyEntry: AssignmentHistory): Promise<void> {
    this.historyEntries.push(historyEntry);
  }

  public async findAll(): Promise<ProjectAssignment[]> {
    return this.assignments.map((item) => this.cloneAssignment(item));
  }

  public async findByQuery(query: {
    personId?: string;
    projectId?: string;
    statuses?: string[];
  }): Promise<ProjectAssignment[]> {
    const normalizedStatuses = query.statuses?.map((status) => status.toUpperCase());

    return this.assignments
      .filter((item) => (query.personId ? item.personId === query.personId : true))
      .filter((item) => (query.projectId ? item.projectId === query.projectId : true))
      .filter((item) =>
        normalizedStatuses?.length
          ? normalizedStatuses.includes(item.status.value.toUpperCase())
          : true,
      )
      .map((item) => this.cloneAssignment(item));
  }

  public async findActiveByProjectId(projectId: string, asOf: Date): Promise<ProjectAssignment[]> {
    return this.assignments.filter(
      (item) => item.projectId === projectId && item.isActiveAt(asOf),
    ).map((item) => this.cloneAssignment(item));
  }

  public async findApprovalsByAssignmentId(
    assignmentId: AssignmentId,
  ): Promise<AssignmentApproval[]> {
    return this.approvals.filter((item) => item.assignmentId.equals(assignmentId));
  }

  public async findByAssignmentId(assignmentId: AssignmentId): Promise<ProjectAssignment | null> {
    const assignment = this.assignments.find((item) => item.assignmentId.equals(assignmentId));
    return assignment ? this.cloneAssignment(assignment) : null;
  }

  public async findById(id: string): Promise<ProjectAssignment | null> {
    const assignment = this.assignments.find((item) => item.id === id);
    return assignment ? this.cloneAssignment(assignment) : null;
  }

  public async findHistoryByAssignmentId(
    assignmentId: AssignmentId,
  ): Promise<AssignmentHistory[]> {
    return this.historyEntries.filter((item) => item.assignmentId.equals(assignmentId));
  }

  public async findInactiveByProjectId(projectId: string, asOf: Date): Promise<ProjectAssignment[]> {
    return this.assignments.filter(
      (item) => item.projectId === projectId && !item.isActiveAt(asOf),
    ).map((item) => this.cloneAssignment(item));
  }

  public async findOverlappingByPersonAndProject(
    personId: string,
    projectId: string,
    start: Date,
    end?: Date,
  ): Promise<ProjectAssignment[]> {
    return this.assignments.filter(
      (item) =>
        item.personId === personId &&
        item.projectId === projectId &&
        ['REQUESTED', 'APPROVED', 'ACTIVE'].includes(item.status.value) &&
        item.overlaps({ end, start }),
    ).map((item) => this.cloneAssignment(item));
  }

  public async save(aggregate: ProjectAssignment): Promise<void> {
    const index = this.assignments.findIndex((item) => item.id === aggregate.id);
    if (index >= 0) {
      const persisted = this.assignments[index];
      if (persisted.version !== aggregate.version) {
        throw new AssignmentConcurrencyConflictError();
      }

      const nextVersion = aggregate.version + 1;
      aggregate.synchronizeVersion(nextVersion);
      this.assignments.splice(index, 1, this.cloneAssignment(aggregate));
      return;
    }

    aggregate.synchronizeVersion(1);
    this.assignments.push(this.cloneAssignment(aggregate));
  }

  private cloneAssignment(assignment: ProjectAssignment): ProjectAssignment {
    return ProjectAssignment.create(
      {
        allocationPercent: assignment.allocationPercent,
        approvedAt: assignment.approvedAt,
        archivedAt: assignment.archivedAt,
        notes: assignment.notes,
        personId: assignment.personId,
        projectId: assignment.projectId,
        requestedAt: assignment.requestedAt,
        requestedByPersonId: assignment.requestedByPersonId,
        staffingRole: assignment.staffingRole,
        status: assignment.status,
        validFrom: assignment.validFrom,
        validTo: assignment.validTo,
        version: assignment.version,
      },
      assignment.assignmentId,
    );
  }
}
