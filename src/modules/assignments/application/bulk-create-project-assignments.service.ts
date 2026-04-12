import { Injectable } from '@nestjs/common';

import { CreateProjectAssignmentService } from './create-project-assignment.service';

interface BulkProjectAssignmentEntry {
  allocationPercent: number;
  endDate?: string;
  note?: string;
  personId: string;
  projectId: string;
  staffingRole: string;
  startDate: string;
}

interface BulkCreateProjectAssignmentsCommand {
  actorId: string;
  entries: BulkProjectAssignmentEntry[];
}

interface BulkCreateProjectAssignmentsResult {
  createdCount: number;
  createdItems: Array<{
    assignmentId: string;
    index: number;
  }>;
  failedCount: number;
  failedItems: Array<{
    code: string;
    index: number;
    message: string;
    personId: string;
    projectId: string;
    staffingRole: string;
  }>;
  message?: string;
  strategy: 'PARTIAL_SUCCESS';
  totalCount: number;
}

@Injectable()
export class BulkCreateProjectAssignmentsService {
  public constructor(
    private readonly createProjectAssignmentService: CreateProjectAssignmentService,
  ) {}

  public async execute(
    command: BulkCreateProjectAssignmentsCommand,
  ): Promise<BulkCreateProjectAssignmentsResult> {
    if (!Array.isArray(command.entries) || command.entries.length === 0) {
      throw new Error('Bulk assignment request must include at least one entry.');
    }

    const createdItems: BulkCreateProjectAssignmentsResult['createdItems'] = [];
    const failedItems: BulkCreateProjectAssignmentsResult['failedItems'] = [];

    for (const [index, entry] of command.entries.entries()) {
      try {
        const assignment = await this.createProjectAssignmentService.execute({
          actorId: command.actorId,
          allocationPercent: entry.allocationPercent,
          endDate: entry.endDate,
          note: entry.note,
          personId: entry.personId,
          projectId: entry.projectId,
          staffingRole: entry.staffingRole,
          startDate: entry.startDate,
        });

        createdItems.push({
          assignmentId: assignment.assignmentId.value,
          index,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Bulk assignment item failed.';
        failedItems.push({
          code: this.mapErrorCode(message),
          index,
          message,
          personId: entry.personId,
          projectId: entry.projectId,
          staffingRole: entry.staffingRole,
        });
      }
    }

    return {
      createdCount: createdItems.length,
      createdItems,
      failedCount: failedItems.length,
      failedItems,
      message:
        failedItems.length > 0
          ? 'Bulk assignment request completed with item-level failures.'
          : 'Bulk assignment request completed successfully.',
      strategy: 'PARTIAL_SUCCESS',
      totalCount: command.entries.length,
    };
  }

  private mapErrorCode(message: string): string {
    switch (message) {
      case 'Person does not exist.':
        return 'PERSON_NOT_FOUND';
      case 'Project does not exist.':
        return 'PROJECT_NOT_FOUND';
      case 'Inactive employees cannot receive new assignments.':
        return 'PERSON_INACTIVE';
      case 'Overlapping assignment for the same person and project already exists.':
        return 'ASSIGNMENT_CONFLICT';
      case 'Assignment start date is invalid.':
      case 'Assignment end date is invalid.':
      case 'Assignment end date must be on or after the start date.':
      case 'Allocation percent must be between 0 and 100.':
        return 'VALIDATION_ERROR';
      default:
        return 'ASSIGNMENT_CREATION_FAILED';
    }
  }
}
