import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

interface MetadataEntryProps {
  archivedAt?: Date;
  displayName: string;
  entryKey: string;
  entryValue: string;
  isEnabled?: boolean;
  metadataDictionaryId: string;
  sortOrder: number;
}

export class MetadataEntry extends AggregateRoot<MetadataEntryProps> {
  public static create(props: MetadataEntryProps, id?: string): MetadataEntry {
    return new MetadataEntry(
      {
        ...props,
        isEnabled: props.isEnabled ?? true,
      },
      id ?? randomUUID(),
    );
  }

  public activate(): void {
    this.props.isEnabled = true;
    this.props.archivedAt = undefined;
  }

  public deactivate(): void {
    this.props.isEnabled = false;
  }

  public get entryKey(): string {
    return this.props.entryKey;
  }

  public get metadataDictionaryId(): string {
    return this.props.metadataDictionaryId;
  }

  public get entryValue(): string {
    return this.props.entryValue;
  }

  public get displayName(): string {
    return this.props.displayName;
  }

  public get sortOrder(): number {
    return this.props.sortOrder;
  }

  public get isEnabled(): boolean {
    return this.props.isEnabled ?? true;
  }

  public get archivedAt(): Date | undefined {
    return this.props.archivedAt;
  }
}
