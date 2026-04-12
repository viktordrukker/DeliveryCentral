import { demoOrgUnits } from '../../../../../../prisma/seeds/demo-dataset';
import { OrgUnit } from '../../../domain/entities/org-unit.entity';
import { OrgUnitId } from '../../../domain/value-objects/org-unit-id';
import { PersonId } from '../../../domain/value-objects/person-id';
import { InMemoryOrgUnitRepository } from './in-memory-org-unit.repository';

export function createSeededInMemoryOrgUnitRepository(): InMemoryOrgUnitRepository {
  return new InMemoryOrgUnitRepository(
    demoOrgUnits.map((orgUnit) =>
      OrgUnit.create(
        {
          code: orgUnit.code,
          managerPersonId: orgUnit.managerPersonId
            ? PersonId.from(orgUnit.managerPersonId)
            : undefined,
          name: orgUnit.name,
          parentOrgUnitId: orgUnit.parentOrgUnitId
            ? OrgUnitId.from(orgUnit.parentOrgUnitId)
            : undefined,
        },
        OrgUnitId.from(orgUnit.id),
      ),
    ),
  );
}
