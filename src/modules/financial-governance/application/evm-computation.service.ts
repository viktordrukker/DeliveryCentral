import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * Sprint 4 / S4-1 — EVM auto-compute.
 *
 * Computes Earned Value Management metrics from authoritative operational
 * data and writes them back to `ProjectBudget` so the same row that the
 * Radiator Budget quadrant already reads (CPI / spendRate / forecastAccuracy
 * / capexCompliance — see `radiator-signal-collector.service.ts`) reflects
 * real movement instead of manually-seeded numbers. That is S4-2: no code
 * change on the radiator side; the wire is "this service writes the columns
 * the radiator already reads."
 *
 * Inputs:
 *   - `actualCost`     ← Σ approved TimesheetEntry.hours × PersonCostRate.hourlyRate
 *                       (rate effective on entry.date)
 *   - `earnedValue`    ← Σ over ProjectMilestone in FY: weight × (progressPct/100) × BAC
 *   - `plannedToDate`  ← Σ over ProjectMilestone in FY with plannedDate ≤ today: weight × BAC
 *   - `eac`            ← BAC × (AC / EV); falls back to AC if EV = 0
 *   - `capexCorrectPct` ← capex hours / total hours (NULL if no hours)
 *
 * Where BAC = capexBudget + opexBudget on the matching ProjectBudget row.
 *
 * Milestone weighting is equal-share (1/N). The schema has no `weightPct`
 * column yet; introducing one is a follow-up. Equal weight is a defensible
 * default and trivially replaceable when the column lands.
 *
 * Safety / scope rules:
 *   - We never auto-create a ProjectBudget row. If a project has no budget,
 *     `recomputeForProject` returns the diagnostic snapshot but does NOT
 *     persist (a 0-BAC create would pollute the rollups). BAC has to be
 *     entered by a human before EVM means anything.
 *   - We only touch the 5 EVM columns + `updatedByPersonId` + bump `version`.
 *     `capexBudget` / `opexBudget` / `vendorBudget` / `currencyCode` are NEVER
 *     overwritten by this service.
 *   - The compute path is read-only on the operational tables; persistence
 *     is a single `update` per project.
 *
 * Cron: this service is invoked on-demand via the admin endpoint today.
 * A nightly trigger is a follow-up (will live in a thin scheduler module
 * once `@nestjs/schedule` is vetted).
 */

export interface EvmSnapshot {
  projectId: string;
  fiscalYear: number;
  bac: number;
  actualCost: number;
  earnedValue: number;
  plannedValue: number;
  eac: number;
  capexCorrectPct: number | null;
  totalHours: number;
  capexHours: number;
  milestonesCount: number;
  budgetExists: boolean;
}

export interface EvmRunSummary {
  fiscalYear: number;
  projectsProcessed: number;
  persisted: number;
  skippedNoBudget: number;
  failures: number;
  errors: Array<{ projectId: string; error: string }>;
}

interface CostRateRow {
  effectiveFrom: Date;
  hourlyRate: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

@Injectable()
export class EvmComputationService {
  private readonly logger = new Logger(EvmComputationService.name);

  public constructor(private readonly prisma: PrismaService) {}

  public async computeSnapshot(projectId: string, fiscalYear: number): Promise<EvmSnapshot> {
    const budget = await this.prisma.projectBudget.findUnique({
      where: { projectId_fiscalYear: { projectId, fiscalYear } },
      select: { capexBudget: true, opexBudget: true },
    });

    const bac = budget ? Number(budget.capexBudget) + Number(budget.opexBudget) : 0;

    const fyStart = new Date(Date.UTC(fiscalYear, 0, 1));
    const fyEnd = new Date(Date.UTC(fiscalYear, 11, 31, 23, 59, 59, 999));

    const entries = await this.prisma.timesheetEntry.findMany({
      where: {
        projectId,
        date: { gte: fyStart, lte: fyEnd },
        timesheetWeek: { status: 'APPROVED' },
      },
      select: {
        hours: true,
        capex: true,
        date: true,
        timesheetWeek: { select: { personId: true } },
      },
    });

    const personIds = [...new Set(entries.map((e) => e.timesheetWeek.personId))];
    const ratesByPerson = new Map<string, CostRateRow[]>();
    if (personIds.length > 0) {
      const rates = await this.prisma.personCostRate.findMany({
        where: { personId: { in: personIds } },
        select: { personId: true, effectiveFrom: true, hourlyRate: true },
        orderBy: [{ personId: 'asc' }, { effectiveFrom: 'desc' }],
      });
      for (const r of rates) {
        const list = ratesByPerson.get(r.personId) ?? [];
        list.push({ effectiveFrom: r.effectiveFrom, hourlyRate: Number(r.hourlyRate) });
        ratesByPerson.set(r.personId, list);
      }
    }

    let actualCost = 0;
    let totalHours = 0;
    let capexHours = 0;
    for (const e of entries) {
      const hrs = Number(e.hours);
      totalHours += hrs;
      if (e.capex) capexHours += hrs;
      const rates = ratesByPerson.get(e.timesheetWeek.personId) ?? [];
      const applicable = rates.find((r) => r.effectiveFrom <= e.date);
      const rate = applicable?.hourlyRate ?? 0;
      actualCost += hrs * rate;
    }

    const milestones = await this.prisma.projectMilestone.findMany({
      where: {
        projectId,
        plannedDate: { gte: fyStart, lte: fyEnd },
      },
      select: { progressPct: true, plannedDate: true, status: true },
    });

    let earnedValue = 0;
    let plannedValue = 0;
    if (milestones.length > 0 && bac > 0) {
      const weight = 1 / milestones.length;
      const today = new Date();
      for (const m of milestones) {
        const completionPct = (m.progressPct ?? 0) / 100;
        earnedValue += weight * completionPct * bac;
        if (m.plannedDate <= today) {
          plannedValue += weight * bac;
        }
      }
    }

    const eac = earnedValue > 0 ? bac * (actualCost / earnedValue) : actualCost;
    const capexCorrectPct = totalHours > 0 ? capexHours / totalHours : null;

    return {
      projectId,
      fiscalYear,
      bac,
      actualCost: round2(actualCost),
      earnedValue: round2(earnedValue),
      plannedValue: round2(plannedValue),
      eac: round2(eac),
      capexCorrectPct: capexCorrectPct === null ? null : round4(capexCorrectPct),
      totalHours: round2(totalHours),
      capexHours: round2(capexHours),
      milestonesCount: milestones.length,
      budgetExists: budget !== null,
    };
  }

  public async recomputeForProject(
    projectId: string,
    fiscalYear: number,
    actorId: string,
  ): Promise<EvmSnapshot> {
    const snap = await this.computeSnapshot(projectId, fiscalYear);
    if (!snap.budgetExists) {
      return snap;
    }
    await this.prisma.projectBudget.update({
      where: { projectId_fiscalYear: { projectId, fiscalYear } },
      data: {
        earnedValue: snap.earnedValue.toString(),
        actualCost: snap.actualCost.toString(),
        plannedToDate: snap.plannedValue.toString(),
        eac: snap.eac.toString(),
        capexCorrectPct:
          snap.capexCorrectPct === null ? null : snap.capexCorrectPct.toString(),
        updatedByPersonId: actorId,
        version: { increment: 1 },
      },
    });
    return snap;
  }

  public async recomputeAllProjects(
    actorId: string,
    fiscalYear?: number,
  ): Promise<EvmRunSummary> {
    const fy = fiscalYear ?? new Date().getUTCFullYear();
    const projects = await this.prisma.project.findMany({ select: { id: true } });

    let persisted = 0;
    let skippedNoBudget = 0;
    const errors: Array<{ projectId: string; error: string }> = [];

    for (const p of projects) {
      try {
        const snap = await this.recomputeForProject(p.id, fy, actorId);
        if (snap.budgetExists) {
          persisted++;
        } else {
          skippedNoBudget++;
        }
      } catch (err) {
        errors.push({ projectId: p.id, error: (err as Error).message });
        this.logger.warn(
          `EVM recompute failed for project ${p.id} fy ${fy}: ${(err as Error).message}`,
        );
      }
    }

    return {
      fiscalYear: fy,
      projectsProcessed: projects.length,
      persisted,
      skippedNoBudget,
      failures: errors.length,
      errors,
    };
  }
}
