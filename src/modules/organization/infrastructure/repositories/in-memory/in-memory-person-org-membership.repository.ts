import { PersonOrgMembership } from '@src/modules/organization/domain/entities/person-org-membership.entity';
import { PersonOrgMembershipRepositoryPort } from '@src/modules/organization/domain/repositories/person-org-membership-repository.port';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';

export class InMemoryPersonOrgMembershipRepository
  implements PersonOrgMembershipRepositoryPort
{
  public constructor(private readonly items: PersonOrgMembership[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findById(id: string): Promise<PersonOrgMembership | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async findActiveByOrgUnit(orgUnitId: OrgUnitId, asOf: Date): Promise<PersonOrgMembership[]> {
    return this.items.filter(
      (item) => item.orgUnitId.equals(orgUnitId) && item.isEffectiveAt(asOf),
    );
  }

  public async findActiveByPerson(personId: PersonId, asOf: Date): Promise<PersonOrgMembership[]> {
    return this.items.filter(
      (item) => item.personId.equals(personId) && item.isEffectiveAt(asOf),
    );
  }

  public async save(aggregate: PersonOrgMembership): Promise<void> {
    const existingIndex = this.items.findIndex((item) => item.id === aggregate.id);
    if (existingIndex >= 0) {
      this.items.splice(existingIndex, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
