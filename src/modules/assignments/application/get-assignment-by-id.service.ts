import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { AssignmentId } from '../domain/value-objects/assignment-id';
import { AssignmentDetailsDto } from './contracts/assignment-directory.dto';

@Injectable()
export class GetAssignmentByIdService {
  public constructor(
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  public async execute(id: string): Promise<AssignmentDetailsDto | null> {
    const assignment = await this.projectAssignmentRepository.findByAssignmentId(
      AssignmentId.from(id),
    );

    if (!assignment) {
      return null;
    }

    const [dbPeople, dbProjects] = await Promise.all([
      this.prisma.person.findMany({ select: { id: true, displayName: true } }),
      this.prisma.project.findMany({ select: { id: true, name: true } }),
    ]);
    const allPeopleById = new Map(dbPeople.map((p) => [p.id, p]));
    const allProjectsById = new Map(dbProjects.map((p) => [p.id, p]));

    const person = allPeopleById.get(assignment.personId);
    const project = allProjectsById.get(assignment.projectId);
    const [historyEntries, approvalRecords] = await Promise.all([
      this.projectAssignmentRepository.findHistoryByAssignmentId(assignment.assignmentId),
      this.projectAssignmentRepository.findApprovalsByAssignmentId(assignment.assignmentId),
    ]);

    return {
      allocationPercent: assignment.allocationPercent?.value ?? 0,
      approvalState: assignment.status.value,
      approvals: approvalRecords
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
        .map((approval) => ({
          decidedByPersonId: approval.decidedByPersonId
            ? (allPeopleById.get(approval.decidedByPersonId)?.displayName ??
               approval.decidedByPersonId)
            : undefined,
          decisionAt: approval.decisionAt?.toISOString(),
          decisionReason: approval.decisionReason,
          decision: approval.decisionState.value,
          id: approval.id,
          sequenceNumber: approval.sequenceNumber,
        })),
      canApprove: assignment.status.value === 'PROPOSED',
      canEnd: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'].includes(assignment.status.value),
      canReject: assignment.status.value === 'PROPOSED',
      endDate: assignment.validTo?.toISOString() ?? null,
      history: historyEntries
        .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
        .map((entry) => ({
          changeReason: entry.changeReason,
          changeType: entry.changeType,
          changedByPersonId: entry.changedByPersonId
            ? (allPeopleById.get(entry.changedByPersonId)?.displayName ??
               entry.changedByPersonId)
            : undefined,
          id: entry.id,
          newSnapshot: entry.newSnapshot,
          occurredAt: entry.occurredAt.toISOString(),
          previousSnapshot: entry.previousSnapshot,
        })),
      id: assignment.assignmentId.value,
      note: assignment.notes,
      person: {
        displayName: person?.displayName ?? assignment.personId,
        id: assignment.personId,
      },
      project: {
        displayName: project?.name ?? assignment.projectId,
        id: assignment.projectId,
      },
      requestedAt: assignment.requestedAt.toISOString(),
      requestedByPersonId: assignment.requestedByPersonId
        ? (allPeopleById.get(assignment.requestedByPersonId)?.displayName ??
           assignment.requestedByPersonId)
        : undefined,
      staffingRole: assignment.staffingRole,
      startDate: assignment.validFrom.toISOString(),
      version: assignment.version,
    };
  }
}
