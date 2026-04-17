import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { CaseId } from '../value-objects/case-id';
import { CaseParticipant, CaseParticipantRole } from './case-participant.entity';
import { CaseType } from './case-type.entity';

export type CaseStatus = 'ARCHIVED' | 'APPROVED' | 'CANCELLED' | 'COMPLETED' | 'IN_PROGRESS' | 'OPEN' | 'REJECTED';

interface CaseRecordProps {
  archivedAt?: Date;
  cancelReason?: string;
  caseNumber: string;
  caseType: CaseType;
  closedAt?: Date;
  openedAt: Date;
  ownerPersonId: string;
  participants: CaseParticipant[];
  relatedAssignmentId?: string;
  relatedProjectId?: string;
  status: CaseStatus;
  subjectPersonId: string;
  summary?: string;
}

export class CaseRecord extends AggregateRoot<CaseRecordProps> {
  public static create(props: CaseRecordProps, caseId?: CaseId): CaseRecord {
    return new CaseRecord(props, caseId?.value ?? randomUUID());
  }

  public close(): void {
    if (this.props.status === 'COMPLETED') {
      return;
    }

    if (this.props.status !== 'OPEN' && this.props.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot close a case with status ${this.props.status}.`);
    }

    this.props.status = 'COMPLETED';
    this.props.closedAt = new Date();
  }

  public cancel(reason: string): void {
    if (this.props.status === 'CANCELLED') {
      return;
    }

    if (this.props.status === 'COMPLETED' || this.props.status === 'ARCHIVED') {
      throw new Error(`Cannot cancel a case with status ${this.props.status}.`);
    }

    this.props.status = 'CANCELLED';
    this.props.cancelReason = reason;
  }

  public addParticipant(personId: string, role: CaseParticipantRole): void {
    const exists = this.props.participants.some((p) => p.personId === personId);
    if (exists) {
      throw new Error(`Person ${personId} is already a participant.`);
    }
    this.props.participants.push(CaseParticipant.create({ personId, role }));
  }

  public removeParticipant(personId: string): void {
    const idx = this.props.participants.findIndex((p) => p.personId === personId);
    if (idx < 0) {
      throw new Error(`Person ${personId} is not a participant.`);
    }
    this.props.participants.splice(idx, 1);
  }

  public reopen(): void {
    if (this.props.status === 'OPEN' || this.props.status === 'IN_PROGRESS') {
      return;
    }

    if (this.props.status === 'ARCHIVED') {
      throw new Error(`Cannot reopen an archived case.`);
    }

    this.props.status = 'OPEN';
  }

  public approve(): void {
    if (this.props.status !== 'OPEN' && this.props.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot approve a case with status ${this.props.status}.`);
    }
    this.props.status = 'APPROVED';
    this.props.closedAt = new Date();
  }

  public reject(reason: string): void {
    if (this.props.status !== 'OPEN' && this.props.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot reject a case with status ${this.props.status}.`);
    }
    this.props.status = 'REJECTED';
    this.props.cancelReason = reason;
  }

  public archive(): void {
    if (this.props.status === 'ARCHIVED') {
      return;
    }

    this.props.status = 'ARCHIVED';
    this.props.archivedAt = new Date();
  }

  public get archivedAt(): Date | undefined {
    return this.props.archivedAt;
  }

  public get cancelReason(): string | undefined {
    return this.props.cancelReason;
  }

  public get closedAt(): Date | undefined {
    return this.props.closedAt;
  }

  public get caseId(): CaseId {
    return CaseId.from(this.id);
  }

  public get caseNumber(): string {
    return this.props.caseNumber;
  }

  public get caseType(): CaseType {
    return this.props.caseType;
  }

  public get openedAt(): Date {
    return this.props.openedAt;
  }

  public get ownerPersonId(): string {
    return this.props.ownerPersonId;
  }

  public get participants(): CaseParticipant[] {
    return [...this.props.participants];
  }

  public get relatedAssignmentId(): string | undefined {
    return this.props.relatedAssignmentId;
  }

  public get relatedProjectId(): string | undefined {
    return this.props.relatedProjectId;
  }

  public get status(): CaseStatus {
    return this.props.status;
  }

  public get subjectPersonId(): string {
    return this.props.subjectPersonId;
  }

  public get summary(): string | undefined {
    return this.props.summary;
  }
}
