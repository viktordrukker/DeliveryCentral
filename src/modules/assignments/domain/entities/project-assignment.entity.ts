import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { AllocationPercent } from '../value-objects/allocation-percent';
import { ApprovalState } from '../value-objects/approval-state';
import { AssignmentId } from '../value-objects/assignment-id';

interface ProjectAssignmentProps {
  allocationPercent?: AllocationPercent;
  approvedAt?: Date;
  archivedAt?: Date;
  notes?: string;
  personId: string;
  projectId: string;
  requestedAt: Date;
  requestedByPersonId?: string;
  staffingRole: string;
  status: ApprovalState;
  validFrom: Date;
  validTo?: Date;
  version?: number;
}

export class ProjectAssignment extends AggregateRoot<ProjectAssignmentProps> {
  public static create(
    props: ProjectAssignmentProps,
    assignmentId: AssignmentId = AssignmentId.create(),
  ): ProjectAssignment {
    return new ProjectAssignment(props, assignmentId.value);
  }

  public get allocationPercent(): AllocationPercent | undefined {
    return this.props.allocationPercent;
  }

  public get approvedAt(): Date | undefined {
    return this.props.approvedAt;
  }

  public get archivedAt(): Date | undefined {
    return this.props.archivedAt;
  }

  public get assignmentId(): AssignmentId {
    return AssignmentId.from(this.id);
  }

  public get personId(): string {
    return this.props.personId;
  }

  public get projectId(): string {
    return this.props.projectId;
  }

  public get requestedAt(): Date {
    return this.props.requestedAt;
  }

  public get requestedByPersonId(): string | undefined {
    return this.props.requestedByPersonId;
  }

  public get notes(): string | undefined {
    return this.props.notes;
  }

  public get staffingRole(): string {
    return this.props.staffingRole;
  }

  public get status(): ApprovalState {
    return this.props.status;
  }

  public get validFrom(): Date {
    return this.props.validFrom;
  }

  public get validTo(): Date | undefined {
    return this.props.validTo;
  }

  public get version(): number {
    return this.props.version ?? 1;
  }

  public amend(changes: {
    allocationPercent?: AllocationPercent;
    notes?: string;
    staffingRole?: string;
    validTo?: Date;
  }): void {
    const amendableStatuses = ['APPROVED', 'ACTIVE', 'REQUESTED'];
    if (!amendableStatuses.includes(this.props.status.value)) {
      throw new Error(`Assignment cannot be amended in status ${this.props.status.value}.`);
    }

    if (changes.allocationPercent !== undefined) {
      this.props.allocationPercent = changes.allocationPercent;
    }

    if (changes.notes !== undefined) {
      this.props.notes = changes.notes;
    }

    if (changes.staffingRole !== undefined) {
      this.props.staffingRole = changes.staffingRole;
    }

    if (changes.validTo !== undefined) {
      if (changes.validTo < this.props.validFrom) {
        throw new Error('Amendment end date cannot be before the assignment start date.');
      }
      this.props.validTo = changes.validTo;
    }
  }

  public revoke(reason?: string): void {
    const revokableStatuses = ['APPROVED', 'ACTIVE', 'REQUESTED'];
    if (!revokableStatuses.includes(this.props.status.value)) {
      throw new Error(`Assignment cannot be revoked in status ${this.props.status.value}.`);
    }

    this.props.status = ApprovalState.revoked();
    if (reason) {
      this.props.notes = reason;
    }
  }

  public approve(approvedAt: Date): void {
    if (this.props.status.value !== 'REQUESTED') {
      throw new Error(`Assignment cannot transition from ${this.props.status.value} to APPROVED.`);
    }

    this.props.status = ApprovalState.approved();
    this.props.approvedAt = approvedAt;
  }

  public reject(): void {
    if (this.props.status.value !== 'REQUESTED') {
      throw new Error(`Assignment cannot transition from ${this.props.status.value} to REJECTED.`);
    }

    this.props.status = ApprovalState.rejected();
  }

  public end(endedAt: Date): void {
    if (Number.isNaN(endedAt.getTime())) {
      throw new Error('Assignment end date is invalid.');
    }

    if (this.props.status.value === 'ENDED') {
      throw new Error('Assignment is already ended.');
    }

    if (!['APPROVED', 'ACTIVE'].includes(this.props.status.value)) {
      throw new Error(`Assignment cannot transition from ${this.props.status.value} to ENDED.`);
    }

    if (endedAt < this.props.validFrom) {
      throw new Error('Assignment end date must be on or after the assignment start date.');
    }

    if (this.props.validTo && endedAt > this.props.validTo) {
      throw new Error('Assignment end date cannot be after the current assignment end date.');
    }

    this.props.status = ApprovalState.ended();
    this.props.validTo = endedAt;
  }

  public overlaps(range: { start: Date; end?: Date }): boolean {
    const thisStart = this.props.validFrom;
    const thisEnd = this.props.validTo;
    const otherStart = range.start;
    const otherEnd = range.end;

    const startsBeforeOtherEnds = !otherEnd || thisStart <= otherEnd;
    const otherStartsBeforeEnds = !thisEnd || otherStart <= thisEnd;

    return startsBeforeOtherEnds && otherStartsBeforeEnds;
  }

  public isActiveAt(targetDate: Date): boolean {
    const isApprovedState = ['APPROVED', 'ACTIVE'].includes(this.props.status.value);
    const startsSatisfied = targetDate >= this.props.validFrom;
    const endsSatisfied = !this.props.validTo || targetDate <= this.props.validTo;

    return isApprovedState && startsSatisfied && endsSatisfied;
  }

  public hasEndedBefore(targetDate: Date): boolean {
    return Boolean(this.props.validTo && this.props.validTo < targetDate);
  }

  public synchronizeVersion(version: number): void {
    this.props.version = version;
  }
}
