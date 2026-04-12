import { randomUUID } from 'node:crypto';

import {
  demoResourcePoolMemberships,
  demoResourcePools,
} from '../../../../prisma/seeds/demo-dataset';
import { TeamMembershipRecord, TeamRecord, TeamStorePort } from './team-store.port';

export class InMemoryTeamStore extends TeamStorePort {
  public constructor(
    private readonly resourcePools: TeamRecord[] = demoResourcePools,
    private readonly resourcePoolMemberships: TeamMembershipRecord[] = demoResourcePoolMemberships,
  ) {
    super();
  }

  public async addMember(teamId: string, personId: string): Promise<TeamMembershipRecord> {
    const membership: TeamMembershipRecord = {
      id: randomUUID(),
      personId,
      resourcePoolId: teamId,
      validFrom: new Date(),
    };

    this.resourcePoolMemberships.push(membership);
    return membership;
  }

  public async createTeam(input: {
    code: string;
    description?: string;
    name: string;
    orgUnitId?: string;
  }): Promise<TeamRecord> {
    const team: TeamRecord = {
      code: input.code,
      description: input.description,
      id: randomUUID(),
      name: input.name,
      orgUnitId: input.orgUnitId,
    };

    this.resourcePools.push(team);
    return team;
  }

  public async findActiveMembership(
    teamId: string,
    personId: string,
  ): Promise<TeamMembershipRecord | null> {
    const now = new Date();

    return (
      this.resourcePoolMemberships.find(
        (membership) =>
          membership.resourcePoolId === teamId &&
          membership.personId === personId &&
          membership.validFrom <= now &&
          (!membership.validTo || membership.validTo >= now),
      ) ?? null
    );
  }

  public async getMemberships(): Promise<TeamMembershipRecord[]> {
    return this.resourcePoolMemberships;
  }

  public async getTeams(): Promise<TeamRecord[]> {
    return this.resourcePools;
  }

  public async removeMember(
    teamId: string,
    personId: string,
  ): Promise<TeamMembershipRecord | null> {
    const membership = await this.findActiveMembership(teamId, personId);

    if (!membership) {
      return null;
    }

    membership.validTo = new Date(Date.now() - 1);
    return membership;
  }
}

let defaultInMemoryTeamStore: InMemoryTeamStore | null = null;

export function getDefaultInMemoryTeamStore(): InMemoryTeamStore {
  if (!defaultInMemoryTeamStore) {
    defaultInMemoryTeamStore = new InMemoryTeamStore();
  }

  return defaultInMemoryTeamStore;
}
