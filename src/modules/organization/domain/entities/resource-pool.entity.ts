import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { OrgUnitId } from '../value-objects/org-unit-id';

interface ResourcePoolProps {
  code: string;
  name: string;
  orgUnitId?: OrgUnitId;
}

export class ResourcePool extends AggregateRoot<ResourcePoolProps> {
  public static create(props: ResourcePoolProps, id: string): ResourcePool {
    return new ResourcePool(props, id);
  }

  public get orgUnitId(): OrgUnitId | undefined {
    return this.props.orgUnitId;
  }
}
