import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { StaffingRequestProposalCandidate } from './staffing-request-proposal-candidate.entity';

export type StaffingRequestProposalSlateStatusValue =
  | 'OPEN'
  | 'DECIDED'
  | 'EXPIRED'
  | 'WITHDRAWN';

interface StaffingRequestProposalSlateProps {
  candidates: StaffingRequestProposalCandidate[];
  decidedAt?: Date;
  expiresAt?: Date;
  proposedAt: Date;
  proposedByPersonId: string;
  staffingRequestId: string;
  status: StaffingRequestProposalSlateStatusValue;
}

export class StaffingRequestProposalSlate extends AggregateRoot<StaffingRequestProposalSlateProps> {
  public static create(
    props: Omit<StaffingRequestProposalSlateProps, 'status'> & {
      status?: StaffingRequestProposalSlateStatusValue;
    },
    id?: string,
  ): StaffingRequestProposalSlate {
    return new StaffingRequestProposalSlate(
      { ...props, status: props.status ?? 'OPEN' },
      id ?? randomUUID(),
    );
  }

  public get staffingRequestId(): string {
    return this.props.staffingRequestId;
  }

  public get candidates(): readonly StaffingRequestProposalCandidate[] {
    return this.props.candidates;
  }

  public get decidedAt(): Date | undefined {
    return this.props.decidedAt;
  }

  public get expiresAt(): Date | undefined {
    return this.props.expiresAt;
  }

  public get proposedAt(): Date {
    return this.props.proposedAt;
  }

  public get proposedByPersonId(): string {
    return this.props.proposedByPersonId;
  }

  public get status(): StaffingRequestProposalSlateStatusValue {
    return this.props.status;
  }

  public findCandidate(candidateId: string): StaffingRequestProposalCandidate | undefined {
    return this.props.candidates.find((c) => c.id === candidateId);
  }

  public pickCandidate(
    candidateId: string,
    timestamp: Date = new Date(),
  ): StaffingRequestProposalCandidate {
    if (this.props.status !== 'OPEN') {
      throw new Error(`Slate ${this.id} is not OPEN (current status: ${this.props.status}).`);
    }
    const picked = this.findCandidate(candidateId);
    if (!picked) {
      throw new Error(`Candidate ${candidateId} is not part of slate ${this.id}.`);
    }
    picked.pick(timestamp);
    for (const candidate of this.props.candidates) {
      if (candidate.id !== candidateId && candidate.decision === 'PENDING') {
        candidate.autoDecline(timestamp);
      }
    }
    this.props.status = 'DECIDED';
    this.props.decidedAt = timestamp;
    return picked;
  }

  public rejectAll(timestamp: Date = new Date()): void {
    if (this.props.status !== 'OPEN') {
      throw new Error(`Slate ${this.id} is not OPEN (current status: ${this.props.status}).`);
    }
    for (const candidate of this.props.candidates) {
      if (candidate.decision === 'PENDING') {
        candidate.decline(timestamp);
      }
    }
    this.props.status = 'DECIDED';
    this.props.decidedAt = timestamp;
  }

  public withdraw(timestamp: Date = new Date()): void {
    if (this.props.status !== 'OPEN') {
      throw new Error(`Slate ${this.id} cannot be withdrawn (current status: ${this.props.status}).`);
    }
    this.props.status = 'WITHDRAWN';
    this.props.decidedAt = timestamp;
  }
}
