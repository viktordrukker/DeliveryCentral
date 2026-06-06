import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { EvmComputationService } from './evm-computation.service';

/**
 * LEAN-P4-missing-7 — CPI what-if projector.
 *
 * Given a baseline project (EVM snapshot via {@link EvmComputationService})
 * plus a proposed delta (additional people / hours), compute the projected
 * Cost Performance Index (CPI = EV / AC). The scenario is read-only — it
 * never persists. EV is held constant because the scenario adds cost, not
 * scope.
 *
 * Inputs (CpiWhatIfRequest):
 *   - `scenarioPeople[]`: list of role + monthlyRate + monthsRemaining +
 *     quantity rows. Each row's contribution to ACWP is
 *     `monthlyRate × monthsRemaining × quantity`.
 *   - `scenarioAdditionalHours` (optional): additional hours at a default
 *     hourly rate (configurable via blended rate; today derived as
 *     ACWP_baseline / hours_baseline when both are positive, else 0).
 *
 * Output (CpiWhatIfResponse):
 *   - `baselineCPI`: EV / AC (4 dp). When AC = 0 → CPI is reported as 0.
 *   - `projectedCPI`: EV / (AC + deltaACWP) (4 dp).
 *   - `deltaACWP`: total scenario cost (2 dp).
 *   - `warningThreshold`: GREEN (CPI ≥ 0.95), AMBER (≥ 0.85), RED (< 0.85).
 *   - `explanation`: one-line narrative of the projection.
 *
 * Thresholds mirror the radiator Budget quadrant CPI grading (0.95 / 0.85
 * lower-is-bad). The service never writes to ProjectBudget; persistence is
 * intentionally out of scope.
 */

export interface CpiWhatIfPersonRow {
  role: string;
  monthlyRate: number;
  monthsRemaining: number;
  quantity: number;
}

export interface CpiWhatIfRequest {
  scenarioPeople: CpiWhatIfPersonRow[];
  scenarioAdditionalHours?: number;
}

export type CpiWarningThreshold = 'GREEN' | 'AMBER' | 'RED';

export interface CpiWhatIfResponse {
  baselineCPI: number;
  projectedCPI: number;
  deltaACWP: number;
  warningThreshold: CpiWarningThreshold;
  explanation: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function gradeCpi(cpi: number): CpiWarningThreshold {
  if (cpi >= 0.95) return 'GREEN';
  if (cpi >= 0.85) return 'AMBER';
  return 'RED';
}

@Injectable()
export class CpiWhatIfService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly evm: EvmComputationService,
  ) {}

  public async project(
    projectId: string,
    fiscalYear: number,
    request: CpiWhatIfRequest,
  ): Promise<CpiWhatIfResponse> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found.`);
    }

    const snapshot = await this.evm.computeSnapshot(projectId, fiscalYear);

    const baselineAC = snapshot.actualCost;
    const baselineEV = snapshot.earnedValue;
    const baselineCPI =
      baselineAC > 0 ? round4(baselineEV / baselineAC) : 0;

    let deltaACWP = 0;
    for (const row of request.scenarioPeople ?? []) {
      const qty = Math.max(0, row.quantity);
      const monthlyRate = Math.max(0, row.monthlyRate);
      const months = Math.max(0, row.monthsRemaining);
      deltaACWP += monthlyRate * months * qty;
    }

    const additionalHours = Math.max(0, request.scenarioAdditionalHours ?? 0);
    if (additionalHours > 0) {
      const blendedHourly =
        snapshot.totalHours > 0 ? baselineAC / snapshot.totalHours : 0;
      deltaACWP += blendedHourly * additionalHours;
    }

    deltaACWP = round2(deltaACWP);

    const projectedAC = baselineAC + deltaACWP;
    const projectedCPI =
      projectedAC > 0 ? round4(baselineEV / projectedAC) : 0;

    const grade = gradeCpi(projectedCPI);

    const peopleCount = (request.scenarioPeople ?? []).reduce(
      (s, r) => s + Math.max(0, r.quantity),
      0,
    );

    const explanation =
      `Scenario adds ${peopleCount} people` +
      (additionalHours > 0 ? ` + ${additionalHours}h` : '') +
      ` ($${deltaACWP.toLocaleString('en-US')} cost). ` +
      `CPI ${baselineCPI.toFixed(2)} → ${projectedCPI.toFixed(2)} (${grade}).`;

    return {
      baselineCPI,
      projectedCPI,
      deltaACWP,
      warningThreshold: grade,
      explanation,
    };
  }
}
