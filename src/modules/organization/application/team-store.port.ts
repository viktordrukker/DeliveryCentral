export interface TeamRecord {
  code: string;
  description?: string;
  id: string;
  name: string;
  orgUnitId?: string;
}

export interface TeamMembershipRecord {
  id: string;
  personId: string;
  resourcePoolId: string;
  validFrom: Date;
  validTo?: Date;
}

export abstract class TeamStorePort {
  // F-130 / D-103-write-path round 40 — `actorId` threads to the
  // repository so writes can stamp `createdByPersonId` / `updatedByPersonId`.
  public abstract addMember(
    teamId: string,
    personId: string,
    actorId?: string | null,
  ): Promise<TeamMembershipRecord>;
  public abstract createTeam(input: {
    code: string;
    description?: string;
    name: string;
    orgUnitId?: string;
    actorId?: string | null;
  }): Promise<TeamRecord>;
  public abstract findActiveMembership(
    teamId: string,
    personId: string,
  ): Promise<TeamMembershipRecord | null>;
  public abstract getMemberships(): Promise<TeamMembershipRecord[]>;
  public abstract getTeams(): Promise<TeamRecord[]>;
  public abstract removeMember(
    teamId: string,
    personId: string,
    actorId?: string | null,
  ): Promise<TeamMembershipRecord | null>;
}
