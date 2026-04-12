import { randomUUID } from 'node:crypto';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { TeamMembershipRecord, TeamRecord, TeamStorePort } from '../../../application/team-store.port';

export class PrismaTeamStore extends TeamStorePort {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async addMember(teamId: string, personId: string): Promise<TeamMembershipRecord> {
    const record = await this.prisma.personResourcePoolMembership.create({
      data: {
        id: randomUUID(),
        personId,
        resourcePoolId: teamId,
        validFrom: new Date(),
      },
    });

    return this.toMembershipRecord(record);
  }

  public async createTeam(input: {
    code: string;
    description?: string;
    name: string;
    orgUnitId?: string;
  }): Promise<TeamRecord> {
    const record = await this.prisma.resourcePool.create({
      data: {
        code: input.code,
        description: input.description ?? null,
        id: randomUUID(),
        name: input.name,
        orgUnitId: input.orgUnitId ?? null,
      },
    });

    return this.toTeamRecord(record);
  }

  public async findActiveMembership(
    teamId: string,
    personId: string,
  ): Promise<TeamMembershipRecord | null> {
    const now = new Date();
    const record = await this.prisma.personResourcePoolMembership.findFirst({
      where: {
        archivedAt: null,
        personId,
        resourcePoolId: teamId,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
    });

    return record ? this.toMembershipRecord(record) : null;
  }

  public async getMemberships(): Promise<TeamMembershipRecord[]> {
    const records = await this.prisma.personResourcePoolMembership.findMany({
      where: {
        archivedAt: null,
      },
      orderBy: [{ validFrom: 'asc' }],
    });

    return records.map((record) => this.toMembershipRecord(record));
  }

  public async getTeams(): Promise<TeamRecord[]> {
    const records = await this.prisma.resourcePool.findMany({
      where: {
        archivedAt: null,
      },
      orderBy: [{ name: 'asc' }],
    });

    return records.map((record) => this.toTeamRecord(record));
  }

  public async removeMember(
    teamId: string,
    personId: string,
  ): Promise<TeamMembershipRecord | null> {
    const activeMembership = await this.findActiveMembership(teamId, personId);

    if (!activeMembership) {
      return null;
    }

    const endedAt = new Date(Date.now() - 1);
    const record = await this.prisma.personResourcePoolMembership.update({
      data: {
        validTo: endedAt,
      },
      where: {
        id: activeMembership.id,
      },
    });

    return this.toMembershipRecord(record);
  }

  private toMembershipRecord(record: {
    id: string;
    personId: string;
    resourcePoolId: string;
    validFrom: Date;
    validTo: Date | null;
  }): TeamMembershipRecord {
    return {
      id: record.id,
      personId: record.personId,
      resourcePoolId: record.resourcePoolId,
      validFrom: record.validFrom,
      validTo: record.validTo ?? undefined,
    };
  }

  private toTeamRecord(record: {
    code: string;
    description: string | null;
    id: string;
    name: string;
    orgUnitId: string | null;
  }): TeamRecord {
    return {
      code: record.code,
      description: record.description ?? undefined,
      id: record.id,
      name: record.name,
      orgUnitId: record.orgUnitId ?? undefined,
    };
  }
}
