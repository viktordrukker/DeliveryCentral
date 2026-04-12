import { Injectable } from '@nestjs/common';

import { AssignmentHistory } from '../domain/entities/assignment-history.entity';
import { AssignmentId } from '../domain/value-objects/assignment-id';
import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';

interface RevokeAssignmentCommand {
  assignmentId: string;
  reason?: string;
}

@Injectable()
export class RevokeProjectAssignmentService {
  public constructor(private readonly repository: ProjectAssignmentRepositoryPort) {}

  public async execute(command: RevokeAssignmentCommand): Promise<ProjectAssignment> {
    const id = AssignmentId.from(command.assignmentId);
    const assignment = await this.repository.findByAssignmentId(id);

    if (!assignment) {
      throw new Error('Assignment not found.');
    }

    assignment.revoke(command.reason);
    await this.repository.save(assignment);

    const history = AssignmentHistory.create({
      assignmentId: id,
      changeReason: command.reason,
      changeType: 'ASSIGNMENT_REVOKED',
      occurredAt: new Date(),
    });

    await this.repository.appendHistory(history);

    return assignment;
  }
}
