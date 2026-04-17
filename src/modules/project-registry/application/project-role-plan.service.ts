import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface RolePlanEntryDto {
  id: string;
  projectId: string;
  roleName: string;
  seniorityLevel: string | null;
  headcount: number;
  allocationPercent: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  requiredSkillIds: string[];
  source: string;
  notes: string | null;
}

export interface UpsertRolePlanEntryDto {
  roleName: string;
  seniorityLevel?: string;
  headcount?: number;
  allocationPercent?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  requiredSkillIds?: string[];
  source?: string;
  notes?: string;
}

export interface RolePlanComparisonRow {
  roleName: string;
  seniorityLevel: string | null;
  plannedHeadcount: number;
  internalFilled: number;
  vendorFilled: number;
  totalFilled: number;
  fillRate: number;
  gap: number;
  status: 'FILLED' | 'PARTIAL' | 'UNFILLED';
}

export interface RolePlanComparisonResult {
  rows: RolePlanComparisonRow[];
  overallFillRate: number;
  totalPlanned: number;
  totalFilled: number;
  totalGap: number;
}

export interface StaffingSummary {
  totalPlanned: number;
  totalInternalFilled: number;
  totalVendorFilled: number;
  totalFilled: number;
  fillRate: number;
  totalGap: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ProjectRolePlanService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getRolePlan(projectId: string): Promise<RolePlanEntryDto[]> {
    const entries = await this.prisma.projectRolePlan.findMany({
      where: { projectId },
      orderBy: [{ roleName: 'asc' }, { seniorityLevel: 'asc' }],
    });

    // Auto-initialize from existing assignments if no plan exists
    if (entries.length === 0) {
      const derived = await this.initializeFromAssignments(projectId);
      return derived.map((e) => this.toDto(e as any));
    }

    return entries.map((e) => this.toDto(e));
  }

  /** Derive initial role plan from existing active/approved assignments + vendor engagements */
  private async initializeFromAssignments(projectId: string): Promise<Array<{
    id: string; projectId: string; roleName: string; seniorityLevel: string | null;
    headcount: number; allocationPercent: Prisma.Decimal | null;
    plannedStartDate: Date | null; plannedEndDate: Date | null;
    requiredSkillIds: string[]; source: string; notes: string | null;
    createdAt: Date; updatedAt: Date;
  }>> {
    const assignments = await this.prisma.projectAssignment.findMany({
      where: { projectId, status: { in: ['ACTIVE', 'APPROVED', 'REQUESTED'] } },
    });
    const vendorEngagements = await this.prisma.projectVendorEngagement.findMany({
      where: { projectId, status: 'ACTIVE' },
    });

    // Group assignments by staffingRole
    const roleMap = new Map<string, { count: number; avgAlloc: number }>();
    for (const a of assignments) {
      const key = a.staffingRole;
      const existing = roleMap.get(key) ?? { count: 0, avgAlloc: 0 };
      existing.count++;
      existing.avgAlloc = ((existing.avgAlloc * (existing.count - 1)) + Number(a.allocationPercent ?? 100)) / existing.count;
      roleMap.set(key, existing);
    }

    // Group vendor engagements by roleSummary
    for (const v of vendorEngagements) {
      const key = v.roleSummary;
      const existing = roleMap.get(key) ?? { count: 0, avgAlloc: 0 };
      existing.count += v.headcount;
      roleMap.set(key, existing);
    }

    if (roleMap.size === 0) return [];

    // Create plan entries from the grouped data
    const created = [];
    for (const [roleName, data] of roleMap) {
      try {
        const entry = await this.prisma.projectRolePlan.create({
          data: {
            projectId,
            roleName,
            headcount: data.count,
            allocationPercent: data.avgAlloc > 0 ? new Prisma.Decimal(Math.round(data.avgAlloc)) : null,
            source: 'INTERNAL',
          },
        });
        created.push(entry);
      } catch {
        // Skip duplicate constraint violations
      }
    }

    return created;
  }

  public async upsertRolePlan(projectId: string, entries: UpsertRolePlanEntryDto[]): Promise<RolePlanEntryDto[]> {
    const results: RolePlanEntryDto[] = [];

    for (const entry of entries) {
      const existing = await this.prisma.projectRolePlan.findFirst({
        where: {
          projectId,
          roleName: entry.roleName,
          seniorityLevel: entry.seniorityLevel ?? null,
        },
      });

      if (existing) {
        const updated = await this.prisma.projectRolePlan.update({
          where: { id: existing.id },
          data: {
            headcount: entry.headcount ?? existing.headcount,
            allocationPercent: entry.allocationPercent !== undefined ? new Prisma.Decimal(entry.allocationPercent) : existing.allocationPercent,
            plannedStartDate: entry.plannedStartDate ? new Date(entry.plannedStartDate) : existing.plannedStartDate,
            plannedEndDate: entry.plannedEndDate ? new Date(entry.plannedEndDate) : existing.plannedEndDate,
            requiredSkillIds: entry.requiredSkillIds ?? existing.requiredSkillIds,
            source: (entry.source as any) ?? existing.source,
            notes: entry.notes ?? existing.notes,
          },
        });
        results.push(this.toDto(updated));
      } else {
        const created = await this.prisma.projectRolePlan.create({
          data: {
            projectId,
            roleName: entry.roleName,
            seniorityLevel: entry.seniorityLevel ?? null,
            headcount: entry.headcount ?? 1,
            allocationPercent: entry.allocationPercent !== undefined ? new Prisma.Decimal(entry.allocationPercent) : null,
            plannedStartDate: entry.plannedStartDate ? new Date(entry.plannedStartDate) : null,
            plannedEndDate: entry.plannedEndDate ? new Date(entry.plannedEndDate) : null,
            requiredSkillIds: entry.requiredSkillIds ?? [],
            source: (entry.source as any) ?? 'INTERNAL',
            notes: entry.notes ?? null,
          },
        });
        results.push(this.toDto(created));
      }
    }

    return results;
  }

  public async deleteRolePlanEntry(entryId: string): Promise<void> {
    const entry = await this.prisma.projectRolePlan.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Role plan entry not found.');
    await this.prisma.projectRolePlan.delete({ where: { id: entryId } });
  }

  public async getRolePlanVsActual(projectId: string): Promise<RolePlanComparisonResult> {
    const rolePlan = await this.prisma.projectRolePlan.findMany({ where: { projectId } });
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        projectId,
        status: { in: ['ACTIVE', 'APPROVED'] },
      },
    });
    const vendorEngagements = await this.prisma.projectVendorEngagement.findMany({
      where: { projectId, status: 'ACTIVE' },
    });

    const rows: RolePlanComparisonRow[] = rolePlan.map((plan) => {
      // Match assignments by staffingRole (case-insensitive)
      const roleLC = plan.roleName.toLowerCase();
      const matchingAssignments = assignments.filter(
        (a) => a.staffingRole.toLowerCase() === roleLC,
      );
      const matchingVendors = vendorEngagements.filter(
        (v) => v.roleSummary.toLowerCase().includes(roleLC),
      );

      const internalFilled = matchingAssignments.length;
      const vendorFilled = matchingVendors.reduce((sum, v) => sum + v.headcount, 0);
      const totalFilled = internalFilled + vendorFilled;
      const gap = Math.max(0, plan.headcount - totalFilled);
      const fillRate = plan.headcount > 0 ? Math.round((totalFilled / plan.headcount) * 100) : 100;

      return {
        roleName: plan.roleName,
        seniorityLevel: plan.seniorityLevel,
        plannedHeadcount: plan.headcount,
        internalFilled,
        vendorFilled,
        totalFilled,
        fillRate,
        gap,
        status: gap === 0 ? 'FILLED' : totalFilled > 0 ? 'PARTIAL' : 'UNFILLED',
      };
    });

    const totalPlanned = rows.reduce((s, r) => s + r.plannedHeadcount, 0);
    const totalFilled = rows.reduce((s, r) => s + r.totalFilled, 0);
    const totalGap = rows.reduce((s, r) => s + r.gap, 0);
    const overallFillRate = totalPlanned > 0 ? Math.round((totalFilled / totalPlanned) * 100) : 100;

    return { rows, overallFillRate, totalPlanned, totalFilled, totalGap };
  }

  public async getStaffingSummary(projectId: string): Promise<StaffingSummary> {
    const comparison = await this.getRolePlanVsActual(projectId);
    const totalInternalFilled = comparison.rows.reduce((s, r) => s + r.internalFilled, 0);
    const totalVendorFilled = comparison.rows.reduce((s, r) => s + r.vendorFilled, 0);

    return {
      totalPlanned: comparison.totalPlanned,
      totalInternalFilled,
      totalVendorFilled,
      totalFilled: comparison.totalFilled,
      fillRate: comparison.overallFillRate,
      totalGap: comparison.totalGap,
    };
  }

  private toDto(e: {
    id: string;
    projectId: string;
    roleName: string;
    seniorityLevel: string | null;
    headcount: number;
    allocationPercent: Prisma.Decimal | null;
    plannedStartDate: Date | null;
    plannedEndDate: Date | null;
    requiredSkillIds: string[];
    source: string;
    notes: string | null;
  }): RolePlanEntryDto {
    return {
      id: e.id,
      projectId: e.projectId,
      roleName: e.roleName,
      seniorityLevel: e.seniorityLevel,
      headcount: e.headcount,
      allocationPercent: e.allocationPercent ? Number(e.allocationPercent) : null,
      plannedStartDate: e.plannedStartDate?.toISOString().slice(0, 10) ?? null,
      plannedEndDate: e.plannedEndDate?.toISOString().slice(0, 10) ?? null,
      requiredSkillIds: e.requiredSkillIds,
      source: e.source,
      notes: e.notes,
    };
  }
}
