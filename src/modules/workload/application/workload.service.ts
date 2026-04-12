import { Injectable } from '@nestjs/common';

import { WorkloadRepository, WorkloadMatrixFilters, WorkloadPlanningFilters } from '../infrastructure/workload.repository';
import {
  WorkloadMatrixResponse,
  WorkloadPersonDto,
  WorkloadProjectDto,
  WorkloadPlanningResponse,
  WorkloadPlanningPersonDto,
} from './contracts/workload.dto';

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function generate12Weeks(from: Date): string[] {
  const startMonday = getMondayOfWeek(from);
  const weeks: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(startMonday);
    d.setUTCDate(startMonday.getUTCDate() + i * 7);
    weeks.push(toDateStr(d));
  }
  return weeks;
}

@Injectable()
export class WorkloadService {
  public constructor(private readonly repo: WorkloadRepository) {}

  public async checkConflict(params: {
    allocationPercent: number;
    endDate: string;
    excludeAssignmentId?: string;
    personId: string;
    startDate: string;
  }) {
    return this.repo.getOverlappingAllocations(params);
  }

  public async getCapacityForecast(params: { poolId?: string; weeks?: number }) {
    return this.repo.getCapacityForecast(params);
  }

  public async getMatrix(filters: WorkloadMatrixFilters): Promise<WorkloadMatrixResponse> {
    const assignments = await this.repo.getMatrixAssignments(filters);

    const peopleMap = new Map<string, WorkloadPersonDto>();
    const projectsMap = new Map<string, WorkloadProjectDto>();

    for (const assignment of assignments) {
      const personId = assignment.person.id;
      const projectId = assignment.project.id;
      const allocationPercent = assignment.allocationPercent ? Number(assignment.allocationPercent) : 0;

      if (!projectsMap.has(projectId)) {
        projectsMap.set(projectId, {
          id: projectId,
          name: assignment.project.name,
          projectCode: assignment.project.projectCode,
        });
      }

      if (!peopleMap.has(personId)) {
        peopleMap.set(personId, {
          id: personId,
          displayName: assignment.person.displayName,
          allocations: [],
        });
      }

      const person = peopleMap.get(personId)!;
      const existing = person.allocations.find((a) => a.projectId === projectId);

      if (existing) {
        existing.allocationPercent += allocationPercent;
      } else {
        person.allocations.push({
          projectId,
          projectName: assignment.project.name,
          allocationPercent,
        });
      }
    }

    return {
      people: Array.from(peopleMap.values()),
      projects: Array.from(projectsMap.values()),
    };
  }

  public async getPlanning(filters: WorkloadPlanningFilters): Promise<WorkloadPlanningResponse> {
    const now = new Date();
    const weeks = generate12Weeks(now);
    const assignments = await this.repo.getPlanningAssignments(filters);

    const peopleMap = new Map<string, WorkloadPlanningPersonDto>();

    for (const assignment of assignments) {
      const personId = assignment.person.id;

      if (!peopleMap.has(personId)) {
        peopleMap.set(personId, {
          id: personId,
          displayName: assignment.person.displayName,
          assignments: [],
        });
      }

      const person = peopleMap.get(personId)!;
      person.assignments.push({
        id: assignment.id,
        projectId: assignment.project.id,
        projectName: assignment.project.name,
        allocationPercent: assignment.allocationPercent ? Number(assignment.allocationPercent) : 0,
        validFrom: toDateStr(assignment.validFrom),
        validTo: assignment.validTo ? toDateStr(assignment.validTo) : null,
        status: assignment.status,
      });
    }

    return {
      people: Array.from(peopleMap.values()),
      weeks,
    };
  }
}
