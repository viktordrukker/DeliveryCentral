import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { WorkEvidenceRepositoryPort } from '@src/modules/work-evidence/domain/repositories/work-evidence-repository.port';

interface AssignmentAuditComparisonInput {
  asOf: Date;
  projectId: string;
}

interface AssignmentAuditComparisonResult {
  assignedWithoutEvidence: ProjectAssignment[];
  evidenceAfterAssignmentEnd: string[];
  unassignedContributors: string[];
}

export class AssignmentAuditComparisonService {
  public constructor(
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly workEvidenceRepository: WorkEvidenceRepositoryPort,
  ) {}

  public async execute(
    input: AssignmentAuditComparisonInput,
  ): Promise<AssignmentAuditComparisonResult> {
    const activeAssignments = await this.projectAssignmentRepository.findActiveByProjectId(
      input.projectId,
      input.asOf,
    );
    const inactiveAssignments = await this.projectAssignmentRepository.findInactiveByProjectId(
      input.projectId,
      input.asOf,
    );
    const evidence = await this.workEvidenceRepository.findByProjectId(input.projectId, input.asOf);

    const evidenceByPerson = new Map<string, number>();
    for (const item of evidence) {
      if (!item.personId) {
        continue;
      }

      evidenceByPerson.set(item.personId, (evidenceByPerson.get(item.personId) ?? 0) + 1);
    }

    const assignedWithoutEvidence = activeAssignments.filter(
      (assignment) => !evidenceByPerson.has(assignment.personId),
    );

    const activeAssignedPersons = new Set(activeAssignments.map((assignment) => assignment.personId));
    const unassignedContributors = [...evidenceByPerson.keys()].filter(
      (personId) => !activeAssignedPersons.has(personId),
    );

    const endedAssignmentsByPerson = new Set(
      inactiveAssignments
        .filter((assignment) => assignment.hasEndedBefore(input.asOf))
        .map((assignment) => assignment.personId),
    );
    const evidenceAfterAssignmentEnd = [...evidenceByPerson.keys()].filter((personId) =>
      endedAssignmentsByPerson.has(personId),
    );

    return {
      assignedWithoutEvidence,
      evidenceAfterAssignmentEnd,
      unassignedContributors,
    };
  }
}
