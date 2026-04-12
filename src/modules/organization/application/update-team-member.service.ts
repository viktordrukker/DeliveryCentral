import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PersonRepositoryPort } from '../domain/repositories/person-repository.port';

import { TeamStorePort } from './team-store.port';

interface UpdateTeamMemberCommand {
  action: 'add' | 'remove';
  personId: string;
  teamId: string;
}

@Injectable()
export class UpdateTeamMemberService {
  public constructor(
    private readonly teamStore: TeamStorePort,
    private readonly personRepository: PersonRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async execute(command: UpdateTeamMemberCommand): Promise<void> {
    const team = (await this.teamStore.getTeams()).find((item) => item.id === command.teamId);
    if (!team) {
      throw new Error('Team not found.');
    }

    const person = await this.personRepository.findById(command.personId);
    if (!person) {
      throw new Error('Person not found.');
    }

    if (command.action === 'add') {
      if (await this.teamStore.findActiveMembership(command.teamId, command.personId)) {
        throw new Error('Person is already an active member of this team.');
      }

      await this.teamStore.addMember(command.teamId, command.personId);
      this.auditLogger?.record({
        actionType: 'team.members_changed',
        actorId: null,
        category: 'team',
        changeSummary: `${person.displayName} added to team ${team.name}.`,
        details: {
          action: 'add',
          personId: person.id,
        },
        metadata: {
          personId: person.id,
          personName: person.displayName,
          teamCode: team.code,
        },
        targetEntityId: team.id,
        targetEntityType: 'TEAM',
      });
      return;
    }

    const removed = await this.teamStore.removeMember(command.teamId, command.personId);
    if (!removed) {
      throw new Error('Person is not an active member of this team.');
    }

    this.auditLogger?.record({
      actionType: 'team.members_changed',
      actorId: null,
      category: 'team',
      changeSummary: `${person.displayName} removed from team ${team.name}.`,
      details: {
        action: 'remove',
        personId: person.id,
      },
      metadata: {
        personId: person.id,
        personName: person.displayName,
        teamCode: team.code,
      },
      targetEntityId: team.id,
      targetEntityType: 'TEAM',
    });
  }
}
