import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { WorkEvidenceId } from '../value-objects/work-evidence-id';
import { WorkEvidenceLink } from './work-evidence-link.entity';
import { WorkEvidenceSource } from './work-evidence-source.entity';

interface WorkEvidenceProps {
  archivedAt?: Date;
  details?: Record<string, unknown>;
  durationMinutes?: number;
  evidenceType: string;
  occurredOn?: Date;
  personId?: string;
  projectId?: string;
  recordedAt: Date;
  source: WorkEvidenceSource;
  sourceRecordKey: string;
  summary?: string;
  trace?: Record<string, unknown>;
}

export class WorkEvidence extends AggregateRoot<WorkEvidenceProps> {
  private readonly evidenceLinks: WorkEvidenceLink[] = [];

  public static create(
    props: WorkEvidenceProps,
    workEvidenceId: WorkEvidenceId = WorkEvidenceId.create(),
  ): WorkEvidence {
    return new WorkEvidence(props, workEvidenceId.value);
  }

  public addLink(link: WorkEvidenceLink): void {
    this.evidenceLinks.push(link);
  }

  public update(changes: {
    durationMinutes?: number;
    occurredOn?: Date;
    sourceRecordKey?: string;
    summary?: string;
  }): void {
    const EXTERNAL_TYPES = ['JIRA_WORKLOG', 'MEETING'];
    if (EXTERNAL_TYPES.includes(this.props.evidenceType)) {
      throw new Error('External evidence records cannot be edited.');
    }

    if (changes.durationMinutes !== undefined) {
      this.props.durationMinutes = changes.durationMinutes;
    }

    if (changes.occurredOn !== undefined) {
      this.props.occurredOn = changes.occurredOn;
    }

    if (changes.sourceRecordKey !== undefined) {
      this.props.sourceRecordKey = changes.sourceRecordKey;
    }

    if (changes.summary !== undefined) {
      this.props.summary = changes.summary;
    }
  }

  public get links(): WorkEvidenceLink[] {
    return [...this.evidenceLinks];
  }

  public get personId(): string | undefined {
    return this.props.personId;
  }

  public get projectId(): string | undefined {
    return this.props.projectId;
  }

  public get recordedAt(): Date {
    return this.props.recordedAt;
  }

  public get durationMinutes(): number | undefined {
    return this.props.durationMinutes;
  }

  public get evidenceType(): string {
    return this.props.evidenceType;
  }

  public get source(): WorkEvidenceSource {
    return this.props.source;
  }

  public get sourceRecordKey(): string {
    return this.props.sourceRecordKey;
  }

  public get summary(): string | undefined {
    return this.props.summary;
  }

  public get details(): Record<string, unknown> | undefined {
    return this.props.details;
  }

  public get occurredOn(): Date | undefined {
    return this.props.occurredOn;
  }

  public get trace(): Record<string, unknown> | undefined {
    return this.props.trace;
  }

  public get workEvidenceId(): WorkEvidenceId {
    return WorkEvidenceId.from(this.id);
  }
}
