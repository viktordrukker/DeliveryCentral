import { PrismaClient } from '@prisma/client';

import {
  demoAssignmentApprovals,
  demoAssignmentHistory,
  demoAssignments,
} from '../../../prisma/seeds/demo-dataset';

export async function seedDemoAssignmentRuntimeData(prisma: PrismaClient): Promise<void> {
  await prisma.projectAssignment.createMany({
    data: demoAssignments.map((assignment) => ({
      ...assignment,
      status: assignment.status as any,
    })),
  });

  await prisma.assignmentApproval.createMany({
    data: demoAssignmentApprovals.map((approval) => ({
      ...approval,
      decision: approval.decision as any,
    })),
  });

  await prisma.assignmentHistory.createMany({
    data: demoAssignmentHistory.map((entry) => ({
      ...entry,
      newSnapshot: entry.newSnapshot as any,
      previousSnapshot: entry.previousSnapshot as any,
    })),
  });
}
