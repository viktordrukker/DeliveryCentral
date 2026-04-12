import { RepositoryPort } from '@src/shared/domain/repository-port';

import { PersonOrgMembership } from '../entities/person-org-membership.entity';
import { OrgUnitId } from '../value-objects/org-unit-id';
import { PersonId } from '../value-objects/person-id';

export interface PersonOrgMembershipRepositoryPort extends RepositoryPort<PersonOrgMembership> {
  findActiveByOrgUnit(orgUnitId: OrgUnitId, asOf: Date): Promise<PersonOrgMembership[]>;
  findActiveByPerson(personId: PersonId, asOf: Date): Promise<PersonOrgMembership[]>;
}
