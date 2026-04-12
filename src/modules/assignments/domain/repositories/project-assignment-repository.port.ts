import { RepositoryPort } from '@src/shared/domain/repository-port';

import { AssignmentApproval } from '../entities/assignment-approval.entity';
import { AssignmentHistory } from '../entities/assignment-history.entity';
import { ProjectAssignment } from '../entities/project-assignment.entity';
import { AssignmentId } from '../value-objects/assignment-id';

export interface ProjectAssignmentRepositoryPort extends RepositoryPort<ProjectAssignment> {
  appendApproval(approval: AssignmentApproval): Promise<void>;
  appendHistory(historyEntry: AssignmentHistory): Promise<void>;
  findAll(): Promise<ProjectAssignment[]>;
  findActiveByProjectId(projectId: string, asOf: Date): Promise<ProjectAssignment[]>;
  findApprovalsByAssignmentId(assignmentId: AssignmentId): Promise<AssignmentApproval[]>;
  findByAssignmentId(assignmentId: AssignmentId): Promise<ProjectAssignment | null>;
  findHistoryByAssignmentId(assignmentId: AssignmentId): Promise<AssignmentHistory[]>;
  findInactiveByProjectId(projectId: string, asOf: Date): Promise<ProjectAssignment[]>;
  findByQuery(query: {
    personId?: string;
    projectId?: string;
    statuses?: string[];
  }): Promise<ProjectAssignment[]>;
  findOverlappingByPersonAndProject(
    personId: string,
    projectId: string,
    start: Date,
    end?: Date,
  ): Promise<ProjectAssignment[]>;
}
