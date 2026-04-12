import { AggregateRoot } from '@src/shared/domain/aggregate-root';
import { randomUUID } from 'node:crypto';

import { EffectiveDateRange } from '../value-objects/effective-date-range';
import { PersonId } from '../value-objects/person-id';
import { ReportingLineType } from '../value-objects/reporting-line-type';

export type ReportingAuthority = 'APPROVER' | 'REVIEWER' | 'VIEWER';

interface ReportingLineProps {
  authority: ReportingAuthority;
  archivedAt?: Date;
  effectiveDateRange: EffectiveDateRange;
  isPrimary: boolean;
  managerId: PersonId;
  subjectId: PersonId;
  type: ReportingLineType;
}

export class ReportingLine extends AggregateRoot<ReportingLineProps> {
  public static create(props: ReportingLineProps, id?: string): ReportingLine {
    const reportingLineId = id ?? randomUUID();

    return new ReportingLine(props, reportingLineId);
  }

  public get authority(): ReportingAuthority {
    return this.props.authority;
  }

  public get effectiveDateRange(): EffectiveDateRange {
    return this.props.effectiveDateRange;
  }

  public get managerId(): PersonId {
    return this.props.managerId;
  }

  public get subjectId(): PersonId {
    return this.props.subjectId;
  }

  public get type(): ReportingLineType {
    return this.props.type;
  }

  public get isPrimary(): boolean {
    return this.props.isPrimary;
  }

  public endOn(endDate: Date): void {
    this.props.effectiveDateRange = EffectiveDateRange.create(
      this.props.effectiveDateRange.startsAt,
      endDate,
    );
  }

  public isEffectiveAt(targetDate: Date): boolean {
    return this.props.effectiveDateRange.contains(targetDate);
  }
}
