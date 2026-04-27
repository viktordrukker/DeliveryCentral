import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AllocationPercent } from '../domain/value-objects/allocation-percent';
import { AssignmentHistory } from '../domain/entities/assignment-history.entity';
import { AssignmentId } from '../domain/value-objects/assignment-id';
import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';

interface AmendAssignmentCommand {
  allocationPercent?: number;
  assignmentId: string;
  notes?: string;
  staffingRole?: string;
  validTo?: string;
}

@Injectable()
export class AmendProjectAssignmentService {
  public constructor(private readonly repository: ProjectAssignmentRepositoryPort) {}

  public async execute(command: AmendAssignmentCommand): Promise<ProjectAssignment> {
    const id = AssignmentId.from(command.assignmentId);
    const assignment = await this.repository.findByAssignmentId(id);

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    const previous: Record<string, unknown> = {
      allocationPercent: assignment.allocationPercent?.value,
      notes: assignment.notes,
      staffingRole: assignment.staffingRole,
      validTo: assignment.validTo?.toISOString(),
    };

    const changes: Parameters<typeof assignment.amend>[0] = {};

    if (command.allocationPercent !== undefined) {
      changes.allocationPercent = AllocationPercent.from(command.allocationPercent);
    }

    if (command.notes !== undefined) {
      changes.notes = command.notes;
    }

    if (command.staffingRole !== undefined) {
      changes.staffingRole = command.staffingRole;
    }

    if (command.validTo !== undefined) {
      const date = new Date(command.validTo);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Amendment end date is invalid.');
      }
      changes.validTo = date;
    }

    assignment.amend(changes);
    await this.repository.save(assignment);

    const history = AssignmentHistory.create({
      assignmentId: id,
      changeType: 'ASSIGNMENT_AMENDED',
      newSnapshot: {
        allocationPercent: assignment.allocationPercent?.value,
        notes: assignment.notes,
        staffingRole: assignment.staffingRole,
        validTo: assignment.validTo?.toISOString(),
      },
      occurredAt: new Date(),
      previousSnapshot: previous,
    });

    await this.repository.appendHistory(history);

    return assignment;
  }
}
