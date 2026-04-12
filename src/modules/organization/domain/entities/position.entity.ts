import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { OrgUnitId } from '../value-objects/org-unit-id';
import { PersonId } from '../value-objects/person-id';
import { EffectiveDateRange } from '../value-objects/effective-date-range';

interface PositionProps {
  code?: string;
  effectiveDateRange: EffectiveDateRange;
  isManagerial: boolean;
  occupantPersonId?: PersonId;
  orgUnitId: OrgUnitId;
  title: string;
}

export class Position extends AggregateRoot<PositionProps> {
  public static create(props: PositionProps, id: string): Position {
    return new Position(props, id);
  }

  public get orgUnitId(): OrgUnitId {
    return this.props.orgUnitId;
  }

  public get occupantPersonId(): PersonId | undefined {
    return this.props.occupantPersonId;
  }
}
