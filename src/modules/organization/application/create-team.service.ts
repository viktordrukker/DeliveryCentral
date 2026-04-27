import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';

import { TeamRecord, TeamStorePort } from './team-store.port';

interface CreateTeamCommand {
  code: string;
  description?: string | null;
  name: string;
  orgUnitId?: string | null;
}

@Injectable()
export class CreateTeamService {
  public constructor(
    private readonly teamStore: TeamStorePort,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async execute(command: CreateTeamCommand): Promise<TeamRecord> {
    const code = command.code.trim();
    const name = command.name.trim();
    const description = command.description?.trim() || undefined;
    const orgUnitId = command.orgUnitId?.trim() || undefined;

    if (!code) {
      throw new BadRequestException('Team code is required.');
    }

    if (!name) {
      throw new BadRequestException('Team name is required.');
    }

    const duplicate = (await this.teamStore.getTeams()).find(
      (team) => team.code.toLowerCase() === code.toLowerCase(),
    );

    if (duplicate) {
      throw new ConflictException('Team code already exists.');
    }

    const team = await this.teamStore.createTeam({
      code,
      description,
      name,
      orgUnitId,
    });

    this.auditLogger?.record({
      actionType: 'team.created',
      actorId: null,
      category: 'team',
      changeSummary: `Team ${team.name} created.`,
      details: {
        code: team.code,
      },
      metadata: {
        code: team.code,
        description: team.description ?? null,
        name: team.name,
        orgUnitId: team.orgUnitId ?? null,
      },
      targetEntityId: team.id,
      targetEntityType: 'TEAM',
    });

    return team;
  }
}
