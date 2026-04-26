import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export type DerivedStaffingRequestStatus =
  | 'Open'
  | 'In progress'
  | 'Filled'
  | 'Closed'
  | 'Cancelled';

export interface DerivedStaffingRequestSummary {
  assigned: number;
  booked: number;
  cancelled: number;
  completed: number;
  created: number;
  onHold: number;
  onboarding: number;
  proposed: number;
  rejected: number;
  totalAssignments: number;
}

export interface DerivedStaffingRequestResult {
  derivedStatus: DerivedStaffingRequestStatus;
  summary: DerivedStaffingRequestSummary;
}

function emptySummary(): DerivedStaffingRequestSummary {
  return {
    assigned: 0,
    booked: 0,
    cancelled: 0,
    completed: 0,
    created: 0,
    onHold: 0,
    onboarding: 0,
    proposed: 0,
    rejected: 0,
    totalAssignments: 0,
  };
}

export function classifyFromSummary(
  headcountRequired: number,
  summary: DerivedStaffingRequestSummary,
): DerivedStaffingRequestStatus {
  if (summary.totalAssignments === 0) {
    return 'Open';
  }

  const terminal = summary.rejected + summary.cancelled + summary.completed;
  const inFlight =
    summary.created + summary.proposed + summary.booked + summary.onboarding + summary.assigned + summary.onHold;

  if (inFlight === 0 && terminal > 0) {
    const anyCompleted = summary.completed > 0;
    if (anyCompleted) return 'Closed';
    return 'Cancelled';
  }

  const filling = summary.booked + summary.onboarding + summary.assigned;
  const threshold = headcountRequired > 0 ? headcountRequired : 1;
  if (filling >= threshold && summary.onHold === 0) {
    return 'Filled';
  }

  return 'In progress';
}

@Injectable()
export class DeriveStaffingRequestStatusService {
  public constructor(private readonly prisma: PrismaService) {}

  public async deriveForRequest(
    requestId: string,
    headcountRequired: number,
  ): Promise<DerivedStaffingRequestResult> {
    const assignments = await this.prisma.projectAssignment.findMany({
      where: { staffingRequestId: requestId },
      select: { status: true },
    });

    const summary = emptySummary();
    for (const assignment of assignments) {
      summary.totalAssignments += 1;
      switch (assignment.status) {
        case 'CREATED':
          summary.created += 1;
          break;
        case 'PROPOSED':
          summary.proposed += 1;
          break;
        case 'BOOKED':
          summary.booked += 1;
          break;
        case 'ONBOARDING':
          summary.onboarding += 1;
          break;
        case 'ASSIGNED':
          summary.assigned += 1;
          break;
        case 'ON_HOLD':
          summary.onHold += 1;
          break;
        case 'REJECTED':
          summary.rejected += 1;
          break;
        case 'COMPLETED':
          summary.completed += 1;
          break;
        case 'CANCELLED':
          summary.cancelled += 1;
          break;
      }
    }

    return {
      derivedStatus: classifyFromSummary(headcountRequired, summary),
      summary,
    };
  }

  public async deriveForRequests(
    requestIds: readonly string[],
  ): Promise<Map<string, DerivedStaffingRequestResult>> {
    if (requestIds.length === 0) {
      return new Map();
    }

    const requests = await this.prisma.staffingRequest.findMany({
      where: { id: { in: [...requestIds] } },
      select: { id: true, headcountRequired: true },
    });

    const assignments = await this.prisma.projectAssignment.findMany({
      where: { staffingRequestId: { in: [...requestIds] } },
      select: { staffingRequestId: true, status: true },
    });

    const summaryByRequest = new Map<string, DerivedStaffingRequestSummary>();
    for (const request of requests) {
      summaryByRequest.set(request.id, emptySummary());
    }

    for (const assignment of assignments) {
      if (!assignment.staffingRequestId) continue;
      const summary = summaryByRequest.get(assignment.staffingRequestId);
      if (!summary) continue;
      summary.totalAssignments += 1;
      const key = (() => {
        switch (assignment.status) {
          case 'CREATED':
            return 'created' as const;
          case 'PROPOSED':
            return 'proposed' as const;
          case 'BOOKED':
            return 'booked' as const;
          case 'ONBOARDING':
            return 'onboarding' as const;
          case 'ASSIGNED':
            return 'assigned' as const;
          case 'ON_HOLD':
            return 'onHold' as const;
          case 'REJECTED':
            return 'rejected' as const;
          case 'COMPLETED':
            return 'completed' as const;
          case 'CANCELLED':
            return 'cancelled' as const;
          default:
            return null;
        }
      })();
      if (key) summary[key] += 1;
    }

    const result = new Map<string, DerivedStaffingRequestResult>();
    for (const request of requests) {
      const summary = summaryByRequest.get(request.id) ?? emptySummary();
      result.set(request.id, {
        derivedStatus: classifyFromSummary(request.headcountRequired ?? 1, summary),
        summary,
      });
    }
    return result;
  }
}
