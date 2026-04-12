import { Injectable } from '@nestjs/common';

import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';

import { InMemoryProjectRepository } from '../infrastructure/repositories/in-memory/in-memory-project.repository';

export interface ProjectHealthDto {
  projectId: string;
  score: number;
  grade: 'green' | 'yellow' | 'red';
  staffingScore: number;
  evidenceScore: number;
  timelineScore: number;
}

@Injectable()
export class ProjectHealthQueryService {
  public constructor(
    private readonly projectRepository: InMemoryProjectRepository,
    private readonly projectAssignmentRepository: InMemoryProjectAssignmentRepository,
    private readonly workEvidenceRepository: InMemoryWorkEvidenceRepository,
  ) {}

  public async execute(projectId: string): Promise<ProjectHealthDto | null> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      return null;
    }

    const now = new Date();

    // Staffing score (33 pts max)
    const allAssignments = await this.projectAssignmentRepository.findAll();
    const approvedAssignments = allAssignments.filter(
      (a) => a.projectId === projectId && a.status.value === 'APPROVED',
    );
    const assignmentCount = approvedAssignments.length;
    let staffingScore = 0;
    if (assignmentCount > 0) {
      const avgAllocation =
        approvedAssignments.reduce((sum, a) => sum + (a.allocationPercent?.value ?? 0), 0) /
        assignmentCount;
      staffingScore = avgAllocation >= 80 ? 33 : 33;
    }

    // Evidence score (33 pts max)
    const allEvidence = await this.workEvidenceRepository.list({ projectId });
    let evidenceScore = 0;
    if (allEvidence.length > 0) {
      const cutoff30d = new Date(now);
      cutoff30d.setUTCDate(cutoff30d.getUTCDate() - 30);
      const recentEvidence = allEvidence.filter(
        (e) => (e.occurredOn ?? e.recordedAt) >= cutoff30d,
      );
      evidenceScore = recentEvidence.length > 0 ? 33 : 16;
    }

    // Timeline score (34 pts max)
    let timelineScore: number;
    if (!project.endsOn) {
      timelineScore = 17;
    } else if (project.endsOn < now) {
      timelineScore = 0;
    } else {
      timelineScore = 34;
    }

    const score = staffingScore + evidenceScore + timelineScore;
    const grade: 'green' | 'yellow' | 'red' =
      score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';

    return {
      evidenceScore,
      grade,
      projectId,
      score,
      staffingScore,
      timelineScore,
    };
  }
}
