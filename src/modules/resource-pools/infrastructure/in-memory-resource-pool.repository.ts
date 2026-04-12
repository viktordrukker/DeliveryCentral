import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import {
  demoResourcePoolMemberships,
  demoResourcePools,
  demoPeople,
} from '../../../../prisma/seeds/demo-dataset';

export interface ResourcePoolRecord {
  code: string;
  description: string | null;
  id: string;
  members: Array<{ displayName: string; personId: string; validFrom: string }>;
  name: string;
  orgUnitId: string | null;
}

@Injectable()
export class InMemoryResourcePoolRepository {
  private pools: ResourcePoolRecord[];

  public constructor() {
    this.pools = demoResourcePools.map((pool) => {
      const members = demoResourcePoolMemberships
        .filter((m) => m.resourcePoolId === pool.id)
        .map((m) => {
          const person = demoPeople.find((p) => p.id === m.personId);
          return {
            displayName: person?.displayName ?? m.personId,
            personId: m.personId,
            validFrom: m.validFrom.toISOString(),
          };
        });

      return {
        code: pool.code,
        description: pool.description ?? null,
        id: pool.id,
        members,
        name: pool.name,
        orgUnitId: pool.orgUnitId ?? null,
      };
    });
  }

  public findAll(): ResourcePoolRecord[] {
    return this.pools;
  }

  public findById(id: string): ResourcePoolRecord | null {
    return this.pools.find((pool) => pool.id === id) ?? null;
  }

  public create(data: { code: string; description?: string; name: string; orgUnitId?: string }): ResourcePoolRecord {
    const pool: ResourcePoolRecord = {
      code: data.code,
      description: data.description ?? null,
      id: randomUUID(),
      members: [],
      name: data.name,
      orgUnitId: data.orgUnitId ?? null,
    };
    this.pools.push(pool);
    return pool;
  }

  public update(id: string, changes: { description?: string; name?: string }): ResourcePoolRecord | null {
    const pool = this.pools.find((p) => p.id === id);
    if (!pool) return null;
    if (changes.name !== undefined) pool.name = changes.name;
    if (changes.description !== undefined) pool.description = changes.description;
    return pool;
  }

  public addMember(poolId: string, personId: string): ResourcePoolRecord | null {
    const pool = this.pools.find((p) => p.id === poolId);
    if (!pool) return null;
    if (pool.members.some((m) => m.personId === personId)) return pool;
    const person = demoPeople.find((p) => p.id === personId);
    pool.members.push({
      displayName: person?.displayName ?? personId,
      personId,
      validFrom: new Date().toISOString(),
    });
    return pool;
  }

  public removeMember(poolId: string, personId: string): ResourcePoolRecord | null {
    const pool = this.pools.find((p) => p.id === poolId);
    if (!pool) return null;
    pool.members = pool.members.filter((m) => m.personId !== personId);
    return pool;
  }
}
