import { OrgUnit } from '@src/modules/organization/domain/entities/org-unit.entity';
import { OrgUnitRepositoryPort } from '@src/modules/organization/domain/repositories/org-unit-repository.port';
import { OrgUnitId } from '@src/modules/organization/domain/value-objects/org-unit-id';

export class InMemoryOrgUnitRepository implements OrgUnitRepositoryPort {
  public constructor(private readonly items: OrgUnit[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findById(id: string): Promise<OrgUnit | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async findByOrgUnitId(orgUnitId: OrgUnitId): Promise<OrgUnit | null> {
    return this.items.find((item) => item.orgUnitId.equals(orgUnitId)) ?? null;
  }

  public async findChildren(parentOrgUnitId: OrgUnitId): Promise<OrgUnit[]> {
    return this.items.filter((item) => item.parentOrgUnitId?.equals(parentOrgUnitId) ?? false);
  }

  public async listAll(): Promise<OrgUnit[]> {
    return [...this.items];
  }

  public async save(aggregate: OrgUnit): Promise<void> {
    const existingIndex = this.items.findIndex((item) => item.id === aggregate.id);
    if (existingIndex >= 0) {
      this.items.splice(existingIndex, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
