import { DirectorApprovalThresholdService } from '@src/modules/assignments/application/director-approval-threshold.service';

interface FakeRow {
  key: string;
  value: unknown;
}

function buildPrismaStub(rows: FakeRow[]): { platformSetting: { findMany: jest.Mock } } {
  return {
    platformSetting: {
      findMany: jest.fn().mockResolvedValue(rows),
    },
  };
}

describe('DirectorApprovalThresholdService', () => {
  const startDate = new Date('2026-01-01T00:00:00.000Z');
  const endDateLong = new Date('2027-06-01T00:00:00.000Z'); // ~17 months
  const endDateShort = new Date('2026-04-01T00:00:00.000Z'); // ~3 months

  it('uses defaults (allocation>=80 OR duration>=12mo) when no settings exist', async () => {
    const prisma = buildPrismaStub([]);
    const service = new DirectorApprovalThresholdService(prisma as never);

    expect(await service.evaluate({ allocationPercent: 50, startDate, endDate: endDateShort })).toBe(false);
    expect(await service.evaluate({ allocationPercent: 80, startDate, endDate: endDateShort })).toBe(true);
    expect(await service.evaluate({ allocationPercent: 50, startDate, endDate: endDateLong })).toBe(true);
    expect(await service.evaluate({ allocationPercent: 50, startDate })).toBe(false);
  });

  it('honours admin-overridden allocation threshold', async () => {
    const prisma = buildPrismaStub([
      { key: 'assignment.directorApproval.allocationPercentMin', value: 50 },
    ]);
    const service = new DirectorApprovalThresholdService(prisma as never);
    expect(await service.evaluate({ allocationPercent: 50, startDate, endDate: endDateShort })).toBe(true);
    expect(await service.evaluate({ allocationPercent: 49, startDate, endDate: endDateShort })).toBe(false);
  });

  it('honours admin-overridden duration threshold', async () => {
    const prisma = buildPrismaStub([
      { key: 'assignment.directorApproval.durationMonthsMin', value: 6 },
    ]);
    const service = new DirectorApprovalThresholdService(prisma as never);
    // 3 months < 6 months trigger
    expect(await service.evaluate({ allocationPercent: 10, startDate, endDate: endDateShort })).toBe(false);
    // 17 months >= 6 months trigger
    expect(await service.evaluate({ allocationPercent: 10, startDate, endDate: endDateLong })).toBe(true);
  });

  it('disabling a threshold via null does not trip it', async () => {
    const prisma = buildPrismaStub([
      { key: 'assignment.directorApproval.allocationPercentMin', value: null },
    ]);
    const service = new DirectorApprovalThresholdService(prisma as never);
    // Allocation rule disabled — only duration remains; 3-month assignment with 99% allocation
    // should NOT trip because allocation rule is null.
    expect(await service.evaluate({ allocationPercent: 99, startDate, endDate: endDateShort })).toBe(false);
  });

  it('snapshot() returns the current rule state', async () => {
    const prisma = buildPrismaStub([
      { key: 'assignment.directorApproval.allocationPercentMin', value: 75 },
      { key: 'assignment.directorApproval.durationMonthsMin', value: 9 },
    ]);
    const service = new DirectorApprovalThresholdService(prisma as never);
    expect(await service.snapshot()).toEqual({
      allocationPercentMin: 75,
      durationMonthsMin: 9,
    });
  });
});
