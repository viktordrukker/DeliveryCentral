import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { OrgUnitId } from '../value-objects/org-unit-id';
import { PersonId } from '../value-objects/person-id';

interface OrgUnitProps {
  archivedAt?: Date;
  code: string;
  managerPersonId?: PersonId;
  name: string;
  parentOrgUnitId?: OrgUnitId;
}

export class OrgUnit extends AggregateRoot<OrgUnitProps> {
  public static create(props: OrgUnitProps, orgUnitId: OrgUnitId): OrgUnit {
    return new OrgUnit(props, orgUnitId.value);
  }

  public get orgUnitId(): OrgUnitId {
    return OrgUnitId.from(this.id);
  }

  public get code(): string {
    return this.props.code;
  }

  public get name(): string {
    return this.props.name;
  }

  public get parentOrgUnitId(): OrgUnitId | undefined {
    return this.props.parentOrgUnitId;
  }

  public get managerPersonId(): PersonId | undefined {
    return this.props.managerPersonId;
  }
}
