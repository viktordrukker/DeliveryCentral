import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';

import { InMemoryProjectRepository } from '../infrastructure/repositories/in-memory/in-memory-project.repository';

export interface ProjectHealthDto {
  projectId: string;
  score: number;
  grade: 'green' | 'yellow' | 'red';
  staffingScore: number;
  timeScore: number;
  timelineScore: number;
}

@Injectable()
export class ProjectHealthQueryService {
  public constructor(
    private readonly projectRepository: InMemoryProjectRepository,
    private readonly projectAssignmentRepository: InMemoryProjectAssignmentRepository,
    private readonly prisma: PrismaService,
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

    // Time score (33 pts max) based on approved timesheet activity in the last 30 days.
    const cutoff30d = new Date(now);
    cutoff30d.setUTCDate(cutoff30d.getUTCDate() - 30);
    const approvedEntryCount = await this.prisma.timesheetEntry.count({
      where: {
        date: { gte: cutoff30d, lte: now },
        projectId,
        timesheetWeek: { status: 'APPROVED' },
      },
    });
    const timeScore = approvedEntryCount > 0 ? 33 : assignmentCount > 0 ? 16 : 0;

    // Timeline score (34 pts max)
    let timelineScore: number;
    if (!project.endsOn) {
      timelineScore = 17;
    } else if (project.endsOn < now) {
      timelineScore = 0;
    } else {
      timelineScore = 34;
    }

    const score = staffingScore + timeScore + timelineScore;
    const grade: 'green' | 'yellow' | 'red' =
      score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';

    return {
      grade,
      projectId,
      score,
      staffingScore,
      timeScore,
      timelineScore,
    };
  }
}
