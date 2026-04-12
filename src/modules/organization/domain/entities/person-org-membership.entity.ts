import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { EffectiveDateRange } from '../value-objects/effective-date-range';
import { OrgUnitId } from '../value-objects/org-unit-id';
import { PersonId } from '../value-objects/person-id';

interface PersonOrgMembershipProps {
  effectiveDateRange: EffectiveDateRange;
  isPrimary: boolean;
  orgUnitId: OrgUnitId;
  personId: PersonId;
  positionId?: string;
}

export class PersonOrgMembership extends AggregateRoot<PersonOrgMembershipProps> {
  public static create(props: PersonOrgMembershipProps, id: string): PersonOrgMembership {
    return new PersonOrgMembership(props, id);
  }

  public get orgUnitId(): OrgUnitId {
    return this.props.orgUnitId;
  }

  public get personId(): PersonId {
    return this.props.personId;
  }

  public get isPrimary(): boolean {
    return this.props.isPrimary;
  }

  public get positionId(): string | undefined {
    return this.props.positionId;
  }

  public get effectiveDateRange(): EffectiveDateRange {
    return this.props.effectiveDateRange;
  }

  public isEffectiveAt(targetDate: Date): boolean {
    return this.props.effectiveDateRange.contains(targetDate);
  }
}
