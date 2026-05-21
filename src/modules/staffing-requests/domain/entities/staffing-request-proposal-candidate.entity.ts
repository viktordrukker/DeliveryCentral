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

  /**
   * F-67 / 20c-11 — slate-creation flow needs to back-fill the candidate
   * with its parent slate's id once the slate is persisted (since the slate
   * id is generated server-side at `slate.create()` time, but candidates
   * are constructed before that point). Service-layer used to mutate
   * `candidate.props.slateId` via an `as unknown as { props }` cast; this
   * exposes the operation as an intent-revealing entity method with a
   * guard so the slateId can be set exactly once.
   */
  public bindToSlate(slateId: string): void {
    if (this.props.slateId === slateId) return;
    if (this.props.slateId && this.props.slateId !== '') {
      throw new Error(
        `Candidate ${this.id} is already bound to slate ${this.props.slateId}; cannot rebind to ${slateId}.`,
      );
    }
    this.props.slateId = slateId;
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
