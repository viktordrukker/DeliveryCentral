import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ResourcePoolRecord } from './in-memory-resource-pool.repository';

@Injectable()
export class PrismaResourcePoolRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async findAll(): Promise<ResourcePoolRecord[]> {
    const pools = await this.prisma.resourcePool.findMany({
      include: {
        personMemberships: {
          where: { archivedAt: null },
          include: {
            person: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    return pools.map((pool) => this.toRecord(pool));
  }

  public async findById(id: string): Promise<ResourcePoolRecord | null> {
    const pool = await this.prisma.resourcePool.findUnique({
      where: { id },
      include: {
        personMemberships: {
          where: { archivedAt: null },
          include: {
            person: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    return pool ? this.toRecord(pool) : null;
  }

  public async create(data: {
    code: string;
    description?: string;
    name: string;
    orgUnitId?: string;
  }): Promise<ResourcePoolRecord> {
    const pool = await this.prisma.resourcePool.create({
      data: {
        code: data.code,
        description: data.description ?? null,
        name: data.name,
        orgUnitId: data.orgUnitId ?? null,
      },
      include: {
        personMemberships: {
          where: { archivedAt: null },
          include: {
            person: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    return this.toRecord(pool);
  }

  public async update(
    id: string,
    changes: { description?: string; name?: string },
  ): Promise<ResourcePoolRecord | null> {
    const existing = await this.prisma.resourcePool.findUnique({ where: { id } });
    if (!existing) return null;

    const pool = await this.prisma.resourcePool.update({
      where: { id },
      data: {
        ...(changes.name !== undefined && { name: changes.name }),
        ...(changes.description !== undefined && { description: changes.description }),
      },
      include: {
        personMemberships: {
          where: { archivedAt: null },
          include: {
            person: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    return this.toRecord(pool);
  }

  public async addMember(poolId: string, personId: string): Promise<ResourcePoolRecord | null> {
    const pool = await this.prisma.resourcePool.findUnique({ where: { id: poolId } });
    if (!pool) return null;

    const existingMembership = await this.prisma.personResourcePoolMembership.findFirst({
      where: { resourcePoolId: poolId, personId, archivedAt: null },
    });

    if (!existingMembership) {
      await this.prisma.personResourcePoolMembership.create({
        data: {
          personId,
          resourcePoolId: poolId,
          validFrom: new Date(),
        },
      });
    }

    return this.findById(poolId);
  }

  public async removeMember(poolId: string, personId: string): Promise<ResourcePoolRecord | null> {
    const pool = await this.prisma.resourcePool.findUnique({ where: { id: poolId } });
    if (!pool) return null;

    const membership = await this.prisma.personResourcePoolMembership.findFirst({
      where: { resourcePoolId: poolId, personId, archivedAt: null },
    });

    if (membership) {
      await this.prisma.personResourcePoolMembership.update({
        where: { id: membership.id },
        data: { archivedAt: new Date(), validTo: new Date() },
      });
    }

    return this.findById(poolId);
  }

  private toRecord(pool: {
    code: string;
    description: string | null;
    id: string;
    name: string;
    orgUnitId: string | null;
    personMemberships: Array<{
      person: { displayName: string; id: string };
      validFrom: Date;
    }>;
  }): ResourcePoolRecord {
    return {
      code: pool.code,
      description: pool.description,
      id: pool.id,
      members: pool.personMemberships.map((m) => ({
        displayName: m.person.displayName,
        personId: m.person.id,
        validFrom: m.validFrom.toISOString(),
      })),
      name: pool.name,
      orgUnitId: pool.orgUnitId,
    };
  }
}
