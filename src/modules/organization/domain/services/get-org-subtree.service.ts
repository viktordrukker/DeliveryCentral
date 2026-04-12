import { OrgUnit } from '../entities/org-unit.entity';
import { OrgUnitRepositoryPort } from '../repositories/org-unit-repository.port';
import { OrgUnitId } from '../value-objects/org-unit-id';

interface GetOrgSubtreeInput {
  orgUnitId: OrgUnitId;
}

export class GetOrgSubtreeService {
  public constructor(private readonly orgUnitRepository: OrgUnitRepositoryPort) {}

  public async execute(input: GetOrgSubtreeInput): Promise<OrgUnit[]> {
    const root = await this.orgUnitRepository.findByOrgUnitId(input.orgUnitId);

    if (!root) {
      return [];
    }

    const result: OrgUnit[] = [root];
    const queue: OrgUnit[] = [root];

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      const children = await this.orgUnitRepository.findChildren(current.orgUnitId);
      result.push(...children);
      queue.push(...children);
    }

    return result;
  }
}
