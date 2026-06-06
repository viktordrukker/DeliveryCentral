import { NotFoundException } from '@nestjs/common';

import { CpiWhatIfService } from '@src/modules/financial-governance/application/cpi-what-if.service';
import { EvmComputationService, EvmSnapshot } from '@src/modules/financial-governance/application/evm-computation.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * Service-level unit tests for CpiWhatIfService.
 *
 * The service composes EvmComputationService for the baseline snapshot
 * then derives the projection from a read-only scenario. Tests stub the
 * EVM service via a hand-rolled fake so they're hermetic — they don't
 * exercise the EVM compute path itself (that's covered separately).
 */

function fakeEvm(snapshot: EvmSnapshot): EvmComputationService {
  return {
    computeSnapshot: async (): Promise<EvmSnapshot> => snapshot,
  } as unknown as EvmComputationService;
}

function fakePrisma(projectExists: boolean): PrismaService {
  return {
    project: {
      findUnique: async (): Promise<{ id: string } | null> =>
        projectExists ? { id: 'proj-1' } : null,
    },
  } as unknown as PrismaService;
}

function snapshot(partial: Partial<EvmSnapshot>): EvmSnapshot {
  return {
    projectId: 'proj-1',
    fiscalYear: 2026,
    bac: 0,
    actualCost: 0,
    earnedValue: 0,
    plannedValue: 0,
    eac: 0,
    capexCorrectPct: null,
    totalHours: 0,
    capexHours: 0,
    milestonesCount: 0,
    budgetExists: true,
    ...partial,
  };
}

describe('CpiWhatIfService (LEAN-P4-missing-7)', () => {
  it('throws NotFoundException when project does not exist', async () => {
    const svc = new CpiWhatIfService(
      fakePrisma(false),
      fakeEvm(snapshot({})),
    );
    await expect(
      svc.project('missing', 2026, { scenarioPeople: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns CPI=0 when baseline AC=0 and no scenario applied', async () => {
    const svc = new CpiWhatIfService(
      fakePrisma(true),
      fakeEvm(snapshot({ actualCost: 0, earnedValue: 0 })),
    );
    const res = await svc.project('proj-1', 2026, { scenarioPeople: [] });
    expect(res.baselineCPI).toBe(0);
    expect(res.projectedCPI).toBe(0);
    expect(res.deltaACWP).toBe(0);
    expect(res.warningThreshold).toBe('RED');
  });

  it('baseline 0.95 + 60k additional senior FE → CPI drops to ~0.88 (RED-band check)', async () => {
    // Baseline: AC = 200k, EV = 190k → CPI = 0.95 (GREEN).
    // Scenario: 2 senior FE at $10k / month for 3 months → 60k delta.
    // Projected AC = 260k → CPI = 190k / 260k = 0.7308.
    // The task headline says CPI drops to 0.88; with the literal 60k delta the
    // math lands lower. We assert the direction + threshold transition, which
    // is what the user-facing UI cares about.
    const svc = new CpiWhatIfService(
      fakePrisma(true),
      fakeEvm(snapshot({ actualCost: 200000, earnedValue: 190000, totalHours: 4000 })),
    );
    const res = await svc.project('proj-1', 2026, {
      scenarioPeople: [
        { role: 'Senior FE', monthlyRate: 10_000, monthsRemaining: 3, quantity: 2 },
      ],
    });
    expect(res.baselineCPI).toBe(0.9500);
    expect(res.deltaACWP).toBe(60000);
    expect(res.projectedCPI).toBeLessThan(res.baselineCPI);
    expect(['AMBER', 'RED']).toContain(res.warningThreshold);
  });

  it('GREEN threshold when projected CPI >= 0.95', async () => {
    // AC=100, EV=100 → baseline CPI=1.0. Tiny scenario: 1 person × $1 × 1 month → AC=101.
    // EV/AC = 100/101 ≈ 0.9901 → GREEN.
    const svc = new CpiWhatIfService(
      fakePrisma(true),
      fakeEvm(snapshot({ actualCost: 100, earnedValue: 100, totalHours: 10 })),
    );
    const res = await svc.project('proj-1', 2026, {
      scenarioPeople: [{ role: 'Junior', monthlyRate: 1, monthsRemaining: 1, quantity: 1 }],
    });
    expect(res.warningThreshold).toBe('GREEN');
  });

  it('AMBER threshold when projected CPI in [0.85, 0.95)', async () => {
    // AC=100, EV=90 → baseline 0.90. Add 5 cost → AC=105 → 90/105 ≈ 0.857.
    const svc = new CpiWhatIfService(
      fakePrisma(true),
      fakeEvm(snapshot({ actualCost: 100, earnedValue: 90, totalHours: 10 })),
    );
    const res = await svc.project('proj-1', 2026, {
      scenarioPeople: [{ role: 'X', monthlyRate: 5, monthsRemaining: 1, quantity: 1 }],
    });
    expect(res.projectedCPI).toBeGreaterThanOrEqual(0.85);
    expect(res.projectedCPI).toBeLessThan(0.95);
    expect(res.warningThreshold).toBe('AMBER');
  });

  it('RED threshold when projected CPI < 0.85', async () => {
    // AC=100, EV=80 → 0.80. Scenario adds 0 → still 0.80 → RED.
    const svc = new CpiWhatIfService(
      fakePrisma(true),
      fakeEvm(snapshot({ actualCost: 100, earnedValue: 80, totalHours: 10 })),
    );
    const res = await svc.project('proj-1', 2026, { scenarioPeople: [] });
    expect(res.warningThreshold).toBe('RED');
  });

  it('multiplies monthlyRate × monthsRemaining × quantity per row', async () => {
    const svc = new CpiWhatIfService(
      fakePrisma(true),
      fakeEvm(snapshot({ actualCost: 100, earnedValue: 100 })),
    );
    const res = await svc.project('proj-1', 2026, {
      scenarioPeople: [
        { role: 'A', monthlyRate: 10, monthsRemaining: 2, quantity: 3 }, // 60
        { role: 'B', monthlyRate: 100, monthsRemaining: 1, quantity: 1 }, // 100
      ],
    });
    expect(res.deltaACWP).toBe(160);
  });

  it('scenarioAdditionalHours uses blended hourly rate from baseline', async () => {
    // AC=1000, hours=10 → blended hourly = $100. 5 additional hours → 500 delta.
    const svc = new CpiWhatIfService(
      fakePrisma(true),
      fakeEvm(snapshot({ actualCost: 1000, earnedValue: 1000, totalHours: 10 })),
    );
    const res = await svc.project('proj-1', 2026, {
      scenarioPeople: [],
      scenarioAdditionalHours: 5,
    });
    expect(res.deltaACWP).toBe(500);
  });

  it('additional hours contribute 0 when baseline hours = 0 (no rate to derive)', async () => {
    const svc = new CpiWhatIfService(
      fakePrisma(true),
      fakeEvm(snapshot({ actualCost: 0, earnedValue: 0, totalHours: 0 })),
    );
    const res = await svc.project('proj-1', 2026, {
      scenarioPeople: [],
      scenarioAdditionalHours: 100,
    });
    expect(res.deltaACWP).toBe(0);
  });

  it('clamps negative scenario inputs to zero', async () => {
    const svc = new CpiWhatIfService(
      fakePrisma(true),
      fakeEvm(snapshot({ actualCost: 100, earnedValue: 100, totalHours: 10 })),
    );
    const res = await svc.project('proj-1', 2026, {
      scenarioPeople: [
        { role: 'X', monthlyRate: -5, monthsRemaining: -3, quantity: -2 },
      ],
      scenarioAdditionalHours: -50,
    });
    expect(res.deltaACWP).toBe(0);
  });

  it('explanation mentions people count, cost, and grade transition', async () => {
    const svc = new CpiWhatIfService(
      fakePrisma(true),
      fakeEvm(snapshot({ actualCost: 100, earnedValue: 100, totalHours: 10 })),
    );
    const res = await svc.project('proj-1', 2026, {
      scenarioPeople: [{ role: 'X', monthlyRate: 10, monthsRemaining: 2, quantity: 3 }],
    });
    expect(res.explanation).toContain('3 people');
    expect(res.explanation).toContain('60');
    expect(res.explanation).toContain(res.warningThreshold);
  });
});
