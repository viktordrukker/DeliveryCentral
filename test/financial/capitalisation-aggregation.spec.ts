import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { FinancialService } from '@src/modules/financial-governance/application/financial.service';

function makeEntry(opts: {
  projectId: string;
  date: Date;
  hours: number;
  capex: boolean;
  personId?: string;
}) {
  return {
    projectId: opts.projectId,
    date: opts.date,
    hours: new Prisma.Decimal(opts.hours),
    capex: opts.capex,
    timesheetWeek: { personId: opts.personId ?? 'person-1' },
  };
}

function buildRepo(opts: {
  entries?: object[];
  projectNames?: Array<{ id: string; name: string }>;
  activeAssignments?: object[];
} = {}) {
  return {
    findApprovedEntriesForCapitalisation: jest.fn().mockResolvedValue(opts.entries ?? []),
    findProjectNamesByIds: jest.fn().mockResolvedValue(opts.projectNames ?? []),
    findActiveAssignmentsForProjects: jest.fn().mockResolvedValue(opts.activeAssignments ?? []),
    // Other methods not needed for these tests
    findApprovedEntriesForProject: jest.fn().mockResolvedValue([]),
    findProjectBudget: jest.fn().mockResolvedValue(null),
    findApprovedAssignmentRolesForProject: jest.fn().mockResolvedValue([]),
    findEffectiveCostRates: jest.fn().mockResolvedValue([]),
    findAllPeriodLocks: jest.fn().mockResolvedValue([]),
    findLocksForDate: jest.fn().mockResolvedValue([]),
    createPeriodLock: jest.fn(),
    deletePeriodLock: jest.fn(),
    findProjectBudget_: jest.fn(),
    upsertProjectBudget: jest.fn(),
    createPersonCostRate: jest.fn(),
  };
}

describe('FinancialService.getCapitalisationReport', () => {
  it('throws BadRequestException for invalid dates', async () => {
    const svc = new FinancialService(buildRepo() as any);
    await expect(
      svc.getCapitalisationReport({ from: 'bad', to: '2026-03-31' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns empty report when no entries', async () => {
    const svc = new FinancialService(buildRepo() as any);
    const result = await svc.getCapitalisationReport({ from: '2026-01-01', to: '2026-03-31' });

    expect(result.byProject).toHaveLength(0);
    expect(result.totals.capexHours).toBe(0);
    expect(result.totals.opexHours).toBe(0);
    expect(result.periodTrend).toHaveLength(0);
  });

  it('correctly splits capex and opex hours per project', async () => {
    const entries = [
      makeEntry({ projectId: 'proj-A', date: new Date('2026-01-10'), hours: 10, capex: true }),
      makeEntry({ projectId: 'proj-A', date: new Date('2026-01-11'), hours: 6, capex: false }),
    ];
    const svc = new FinancialService(
      buildRepo({
        entries,
        projectNames: [{ id: 'proj-A', name: 'Alpha' }],
      }) as any,
    );

    const result = await svc.getCapitalisationReport({ from: '2026-01-01', to: '2026-01-31' });

    expect(result.byProject).toHaveLength(1);
    const row = result.byProject[0];
    expect(row.projectId).toBe('proj-A');
    expect(row.projectName).toBe('Alpha');
    expect(row.capexHours).toBe(10);
    expect(row.opexHours).toBe(6);
    expect(row.totalHours).toBe(16);
    expect(row.capexPercent).toBeCloseTo(62.5, 1);
  });

  it('aggregates totals across projects', async () => {
    const entries = [
      makeEntry({ projectId: 'proj-A', date: new Date('2026-01-10'), hours: 8, capex: true }),
      makeEntry({ projectId: 'proj-B', date: new Date('2026-01-10'), hours: 4, capex: false }),
    ];
    const svc = new FinancialService(buildRepo({ entries }) as any);

    const result = await svc.getCapitalisationReport({ from: '2026-01-01', to: '2026-01-31' });

    expect(result.totals.capexHours).toBe(8);
    expect(result.totals.opexHours).toBe(4);
    expect(result.totals.totalHours).toBe(12);
    expect(result.totals.capexPercent).toBeCloseTo(66.7, 1);
  });

  it('builds period trend by calendar month', async () => {
    const entries = [
      makeEntry({ projectId: 'proj-A', date: new Date('2026-01-10'), hours: 10, capex: true }),
      makeEntry({ projectId: 'proj-A', date: new Date('2026-02-05'), hours: 5, capex: false }),
    ];
    const svc = new FinancialService(buildRepo({ entries }) as any);

    const result = await svc.getCapitalisationReport({ from: '2026-01-01', to: '2026-02-28' });

    expect(result.periodTrend).toHaveLength(2);
    expect(result.periodTrend[0].month).toBe('2026-01');
    expect(result.periodTrend[0].capexPercent).toBe(100); // all capex in Jan
    expect(result.periodTrend[1].month).toBe('2026-02');
    expect(result.periodTrend[1].capexPercent).toBe(0); // all opex in Feb
  });

  it('sets alert flag when actual hours deviate >10% from expected', async () => {
    const entries = [
      // Only 1 hour logged, but assignment expects many hours
      makeEntry({ projectId: 'proj-A', date: new Date('2026-01-10'), hours: 1, capex: true }),
    ];
    // 1 person at 100% for the period (Jan, ~23 working days × 8 = 184 expected hours)
    const activeAssignments = [{ projectId: 'proj-A', allocationPercent: 100 }];
    const svc = new FinancialService(
      buildRepo({ entries, activeAssignments }) as any,
    );

    const result = await svc.getCapitalisationReport({ from: '2026-01-01', to: '2026-01-31' });
    const row = result.byProject[0];

    expect(row.alert).toBe(true);
    expect(row.deviation).toBeDefined();
    expect(row.deviation!).toBeGreaterThan(0.1);
  });

  it('does not set alert when actual hours are within 10% of expected', async () => {
    // Use a very short period (1 working day = 8 expected hours at 100%)
    // and log exactly 8 hours
    const entries = [
      makeEntry({ projectId: 'proj-A', date: new Date('2026-01-02'), hours: 8, capex: true }),
    ];
    const activeAssignments = [{ projectId: 'proj-A', allocationPercent: 100 }];
    const svc = new FinancialService(
      buildRepo({ entries, activeAssignments }) as any,
    );

    // 2026-01-02 is a Friday; 1 working day in the period
    const result = await svc.getCapitalisationReport({ from: '2026-01-02', to: '2026-01-02' });
    const row = result.byProject[0];

    expect(row.alert).toBeFalsy();
  });
});
