import { demoPersonOrgMemberships } from '../../../../../../prisma/seeds/demo-dataset';
import { PersonOrgMembership } from '../../../domain/entities/person-org-membership.entity';
import { EffectiveDateRange } from '../../../domain/value-objects/effective-date-range';
import { OrgUnitId } from '../../../domain/value-objects/org-unit-id';
import { PersonId } from '../../../domain/value-objects/person-id';
import { InMemoryPersonOrgMembershipRepository } from './in-memory-person-org-membership.repository';

export function createSeededInMemoryPersonOrgMembershipRepository(): InMemoryPersonOrgMembershipRepository {
  return new InMemoryPersonOrgMembershipRepository(
    demoPersonOrgMemberships.map((membership) =>
      PersonOrgMembership.create(
        {
          effectiveDateRange: EffectiveDateRange.create(
            membership.validFrom,
            (membership as { validTo?: Date }).validTo,
          ),
          isPrimary: membership.isPrimary,
          orgUnitId: OrgUnitId.from(membership.orgUnitId),
          personId: PersonId.from(membership.personId),
          positionId: membership.positionId,
        },
        membership.id,
      ),
    ),
  );
}
