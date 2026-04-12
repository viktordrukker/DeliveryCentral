import { RepositoryPort } from '@src/shared/domain/repository-port';

import { OrgUnit } from '../entities/org-unit.entity';
import { OrgUnitId } from '../value-objects/org-unit-id';

export interface OrgUnitRepositoryPort extends RepositoryPort<OrgUnit> {
  findByOrgUnitId(orgUnitId: OrgUnitId): Promise<OrgUnit | null>;
  findChildren(parentOrgUnitId: OrgUnitId): Promise<OrgUnit[]>;
  listAll(): Promise<OrgUnit[]>;
}
