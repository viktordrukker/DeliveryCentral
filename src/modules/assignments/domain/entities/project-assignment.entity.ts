import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { AllocationPercent } from '../value-objects/allocation-percent';
import { AssignmentId } from '../value-objects/assignment-id';
import {
  ASSIGNMENT_AMEND_SOURCE_STATUSES,
  AssignmentStatus,
  AssignmentStatusValue,
  findTransition,
  InvalidAssignmentTransitionError,
} from '../value-objects/assignment-status';

export type AssignmentSlaStageValue = 'PROPOSAL' | 'REVIEW' | 'APPROVAL' | 'RM_FINALIZE';

interface ProjectAssignmentProps {
  allocationPercent?: AllocationPercent;
  approvedAt?: Date;
  archivedAt?: Date;
  cancellationReason?: string;
  notes?: string;
  onboardingDate?: Date;
  onHoldCaseId?: string;
  onHoldReason?: string;
  personId: string;
  projectId: string;
  rejectionReason?: string;
  rejectionReasonCode?: string;
  requestedAt: Date;
  requestedByPersonId?: string;
  requiresDirectorApproval?: boolean;
  slaBreachedAt?: Date;
  slaDueAt?: Date;
  slaStage?: AssignmentSlaStageValue;
  staffingRequestId?: string;
  staffingRole: string;
  status: AssignmentStatus;
  validFrom: Date;
  validTo?: Date;
  version?: number;
}

export interface TransitionOptions {
  actorRoles: readonly PlatformRole[];
  caseId?: string;
  reason?: string;
  timestamp?: Date;
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

  public get cancellationReason(): string | undefined {
    return this.props.cancellationReason;
  }

  public get onHoldCaseId(): string | undefined {
    return this.props.onHoldCaseId;
  }

  public get onHoldReason(): string | undefined {
    return this.props.onHoldReason;
  }

  public get personId(): string {
    return this.props.personId;
  }

  public get projectId(): string {
    return this.props.projectId;
  }

  public get rejectionReason(): string | undefined {
    return this.props.rejectionReason;
  }

  public get rejectionReasonCode(): string | undefined {
    return this.props.rejectionReasonCode;
  }

  public get onboardingDate(): Date | undefined {
    return this.props.onboardingDate;
  }

  public get requiresDirectorApproval(): boolean {
    return this.props.requiresDirectorApproval ?? false;
  }

  public setRequiresDirectorApproval(value: boolean): void {
    this.props.requiresDirectorApproval = value;
  }

  public setRejectionReasonCode(code: string | undefined): void {
    this.props.rejectionReasonCode = code;
  }

  public setPersonId(personId: string): void {
    this.props.personId = personId;
  }

  public setOnboardingDate(date: Date | undefined): void {
    this.props.onboardingDate = date;
  }

  public get slaStage(): AssignmentSlaStageValue | undefined {
    return this.props.slaStage;
  }

  public get slaDueAt(): Date | undefined {
    return this.props.slaDueAt;
  }

  public get slaBreachedAt(): Date | undefined {
    return this.props.slaBreachedAt;
  }

  public setSlaStage(stage: AssignmentSlaStageValue | undefined): void {
    this.props.slaStage = stage;
  }

  public setSlaDueAt(dueAt: Date | undefined): void {
    this.props.slaDueAt = dueAt;
  }

  public setSlaBreachedAt(breachedAt: Date | undefined): void {
    this.props.slaBreachedAt = breachedAt;
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

  public get staffingRequestId(): string | undefined {
    return this.props.staffingRequestId;
  }

  public get staffingRole(): string {
    return this.props.staffingRole;
  }

  public get status(): AssignmentStatus {
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
    if (!ASSIGNMENT_AMEND_SOURCE_STATUSES.has(this.props.status.value)) {
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

  public transitionTo(target: AssignmentStatusValue, options: TransitionOptions): void {
    const current = this.props.status.value;
    const transition = findTransition(current, target);

    if (!transition) {
      throw new InvalidAssignmentTransitionError(
        `Assignment cannot transition from ${current} to ${target}.`,
      );
    }

    const hasRole =
      options.actorRoles.length === 0 ||
      transition.roles.some((role) => options.actorRoles.includes(role));
    if (!hasRole) {
      throw new InvalidAssignmentTransitionError(
        `Actor roles [${options.actorRoles.join(', ')}] are not permitted to transition assignment from ${current} to ${target}.`,
      );
    }

    if (transition.requiresReason && !options.reason?.trim()) {
      throw new InvalidAssignmentTransitionError(
        `Transition from ${current} to ${target} requires a reason.`,
      );
    }

    // Director approval gate: when an assignment is BOOKED but still flagged
    // for director sign-off (allocation/duration tripped the threshold at
    // creation), it cannot progress further until the directorApprove flow
    // clears the flag. Cancellation is still allowed so a stuck assignment
    // can be unwound.
    if (
      current === 'BOOKED' &&
      this.requiresDirectorApproval &&
      (target === 'ONBOARDING' || target === 'ASSIGNED')
    ) {
      throw new InvalidAssignmentTransitionError(
        `Director approval is still pending for this assignment; cannot transition to ${target}.`,
      );
    }

    this.applyTransitionSideEffects(target, options);
  }

  private applyTransitionSideEffects(
    target: AssignmentStatusValue,
    options: TransitionOptions,
  ): void {
    this.props.status = AssignmentStatus.from(target);
    const timestamp = options.timestamp ?? new Date();

    switch (target) {
      case 'BOOKED':
        this.props.approvedAt = timestamp;
        break;
      case 'REJECTED':
        this.props.rejectionReason = options.reason;
        break;
      case 'ON_HOLD':
        this.props.onHoldReason = options.reason;
        if (options.caseId !== undefined) {
          this.props.onHoldCaseId = options.caseId;
        }
        break;
      case 'ASSIGNED':
        this.props.onHoldReason = undefined;
        this.props.onHoldCaseId = undefined;
        break;
      case 'COMPLETED':
        if (Number.isNaN(timestamp.getTime())) {
          throw new Error('Assignment completion date is invalid.');
        }
        if (timestamp < this.props.validFrom) {
          throw new Error('Assignment completion date must be on or after the start date.');
        }
        this.props.validTo = timestamp;
        break;
      case 'CANCELLED':
        this.props.cancellationReason = options.reason;
        break;
      default:
        break;
    }
  }

  public approve(approvedAt: Date): void {
    this.transitionTo('BOOKED', { actorRoles: [], timestamp: approvedAt });
  }

  public reject(reason?: string): void {
    this.transitionTo('REJECTED', { actorRoles: [], reason: reason ?? 'Rejected' });
  }

  public acknowledgeReview(timestamp: Date = new Date()): void {
    this.transitionTo('IN_REVIEW', { actorRoles: [], timestamp });
  }

  public pickCandidate(timestamp: Date = new Date()): void {
    this.transitionTo('BOOKED', { actorRoles: [], timestamp });
  }

  public activate(): void {
    if (this.props.status.value === 'BOOKED') {
      this.applyTransitionSideEffects('ASSIGNED', { actorRoles: [] });
      return;
    }
    if (this.props.status.value === 'ONBOARDING') {
      this.applyTransitionSideEffects('ASSIGNED', { actorRoles: [] });
      return;
    }
    throw new InvalidAssignmentTransitionError(
      `Assignment cannot transition from ${this.props.status.value} to ASSIGNED.`,
    );
  }

  public end(endedAt: Date): void {
    if (Number.isNaN(endedAt.getTime())) {
      throw new Error('Assignment end date is invalid.');
    }
    if (this.props.status.value === 'COMPLETED') {
      throw new Error('Assignment is already completed.');
    }
    if (!['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'].includes(this.props.status.value)) {
      throw new Error(`Assignment cannot transition from ${this.props.status.value} to COMPLETED.`);
    }
    if (endedAt < this.props.validFrom) {
      throw new Error('Assignment end date must be on or after the assignment start date.');
    }
    if (this.props.validTo && endedAt > this.props.validTo) {
      throw new Error('Assignment end date cannot be after the current assignment end date.');
    }
    this.applyTransitionSideEffects('COMPLETED', { actorRoles: [], timestamp: endedAt });
  }

  public revoke(reason?: string): void {
    const revokableStatuses: AssignmentStatusValue[] = [
      'CREATED',
      'PROPOSED',
      'IN_REVIEW',
      'BOOKED',
      'ONBOARDING',
      'ASSIGNED',
      'ON_HOLD',
    ];
    if (!revokableStatuses.includes(this.props.status.value)) {
      throw new Error(`Assignment cannot be revoked in status ${this.props.status.value}.`);
    }
    this.applyTransitionSideEffects('CANCELLED', {
      actorRoles: [],
      reason: reason ?? 'Revoked',
    });
    if (reason) {
      this.props.notes = reason;
    }
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
    const activeStates: AssignmentStatusValue[] = ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'];
    const isAllocated = activeStates.includes(this.props.status.value);
    const startsSatisfied = targetDate >= this.props.validFrom;
    const endsSatisfied = !this.props.validTo || targetDate <= this.props.validTo;

    return isAllocated && startsSatisfied && endsSatisfied;
  }

  public hasEndedBefore(targetDate: Date): boolean {
    return Boolean(this.props.validTo && this.props.validTo < targetDate);
  }

  public synchronizeVersion(version: number): void {
    this.props.version = version;
  }
}
