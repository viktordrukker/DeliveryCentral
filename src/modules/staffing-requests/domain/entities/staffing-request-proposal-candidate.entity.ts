import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

export type StaffingRequestProposalCandidateDecisionValue =
  | 'PENDING'
  | 'PICKED'
  | 'DECLINED'
  | 'AUTO_DECLINED';

interface StaffingRequestProposalCandidateProps {
  availabilityPercent?: number;
  candidatePersonId: string;
  decidedAt?: Date;
  decision: StaffingRequestProposalCandidateDecisionValue;
  matchScore: number;
  mismatchedSkills: readonly string[];
  rank: number;
  rationale?: string;
  slateId: string;
}

export class StaffingRequestProposalCandidate extends AggregateRoot<StaffingRequestProposalCandidateProps> {
  public static create(
    props: Omit<StaffingRequestProposalCandidateProps, 'decision'> & {
      decision?: StaffingRequestProposalCandidateDecisionValue;
    },
    id?: string,
  ): StaffingRequestProposalCandidate {
    return new StaffingRequestProposalCandidate(
      {
        ...props,
        decision: props.decision ?? 'PENDING',
        mismatchedSkills: props.mismatchedSkills ?? [],
      },
      id ?? randomUUID(),
    );
  }

  public get availabilityPercent(): number | undefined {
    return this.props.availabilityPercent;
  }

  public get candidatePersonId(): string {
    return this.props.candidatePersonId;
  }

  public get decidedAt(): Date | undefined {
    return this.props.decidedAt;
  }

  public get decision(): StaffingRequestProposalCandidateDecisionValue {
    return this.props.decision;
  }

  public get matchScore(): number {
    return this.props.matchScore;
  }

  public get mismatchedSkills(): readonly string[] {
    return this.props.mismatchedSkills;
  }

  public get rank(): number {
    return this.props.rank;
  }

  public get rationale(): string | undefined {
    return this.props.rationale;
  }

  public get slateId(): string {
    return this.props.slateId;
  }

  public pick(timestamp: Date = new Date()): void {
    if (this.props.decision !== 'PENDING') {
      throw new Error(
        `Candidate ${this.id} cannot be picked because it is already ${this.props.decision}.`,
      );
    }
    this.props.decision = 'PICKED';
    this.props.decidedAt = timestamp;
  }

  public decline(timestamp: Date = new Date()): void {
    this.props.decision = 'DECLINED';
    this.props.decidedAt = timestamp;
  }

  public autoDecline(timestamp: Date = new Date()): void {
    if (this.props.decision === 'PICKED') {
      throw new Error(`Candidate ${this.id} is already PICKED and cannot be auto-declined.`);
    }
    this.props.decision = 'AUTO_DECLINED';
    this.props.decidedAt = timestamp;
  }
}
