import { AggregateRoot } from '@src/shared/domain/aggregate-root';

interface WorkEvidenceSourceProps {
  archivedAt?: Date;
  connectionKey?: string;
  displayName: string;
  provider: string;
  sourceType: string;
}

export class WorkEvidenceSource extends AggregateRoot<WorkEvidenceSourceProps> {
  public static create(props: WorkEvidenceSourceProps, id: string): WorkEvidenceSource {
    return new WorkEvidenceSource(props, id);
  }

  public get provider(): string {
    return this.props.provider;
  }

  public get connectionKey(): string | undefined {
    return this.props.connectionKey;
  }

  public get displayName(): string {
    return this.props.displayName;
  }

  public get sourceType(): string {
    return this.props.sourceType;
  }

  public get archivedAt(): Date | undefined {
    return this.props.archivedAt;
  }
}
