import { FinancialService } from './financial.service';

/**
 * EPIC A — Budget upsert reconnects EVM.
 *
 * Verifies FinancialService.upsertProjectBudget triggers a server-side EVM
 * recompute (so CPI/EAC/EV/AC refresh on save) and that a recompute failure
 * never fails the budget write.
 */
describe('FinancialService.upsertProjectBudget — EVM reconnect (EPIC A)', () => {
  const savedBudget = {
    id: 'b1',
    projectId: 'p1',
    fiscalYear: 2026,
    capexBudget: 100_000,
    opexBudget: 50_000,
  };

  function makeRepo() {
    return {
      findProjectBudget: jest.fn().mockResolvedValue(null),
      upsertProjectBudget: jest.fn().mockResolvedValue(savedBudget),
    };
  }

  it('recomputes EVM for the project after the budget upsert', async () => {
    const repo = makeRepo();
    const evm = { recomputeForProject: jest.fn().mockResolvedValue({}) };
    const service = new FinancialService(repo as never, undefined, undefined, evm as never);

    await service.upsertProjectBudget('p1', { fiscalYear: 2026, capexBudget: 100_000, opexBudget: 50_000 }, 'actor-1');

    expect(evm.recomputeForProject).toHaveBeenCalledWith('p1', 2026, 'actor-1');
  });

  it('still returns the saved budget when the EVM recompute throws (best-effort)', async () => {
    const repo = makeRepo();
    const evm = { recomputeForProject: jest.fn().mockRejectedValue(new Error('boom')) };
    const service = new FinancialService(repo as never, undefined, undefined, evm as never);

    const result = await service.upsertProjectBudget(
      'p1',
      { fiscalYear: 2026, capexBudget: 100_000, opexBudget: 50_000 },
      'actor-1',
    );

    expect(result.id).toBe('b1');
    expect(evm.recomputeForProject).toHaveBeenCalled();
  });

  it('does not require an EVM service (optional dependency)', async () => {
    const repo = makeRepo();
    const service = new FinancialService(repo as never);

    const result = await service.upsertProjectBudget('p1', { fiscalYear: 2026, capexBudget: 1, opexBudget: 1 });
    expect(result.id).toBe('b1');
  });

  it('persists vendorBudget + currencyCode when provided (EPIC G)', async () => {
    const repo = makeRepo();
    const service = new FinancialService(repo as never);

    await service.upsertProjectBudget(
      'p1',
      { fiscalYear: 2026, capexBudget: 100_000, opexBudget: 50_000, vendorBudget: 25_000, currencyCode: 'USD' },
      'actor-1',
    );

    const arg = (repo.upsertProjectBudget as jest.Mock).mock.calls[0][0];
    expect(arg.currencyCode).toBe('USD');
    expect(Number(arg.vendorBudget)).toBe(25_000); // passed as a Prisma.Decimal
  });

  it('omits vendorBudget + currencyCode when not provided', async () => {
    const repo = makeRepo();
    const service = new FinancialService(repo as never);

    await service.upsertProjectBudget('p1', { fiscalYear: 2026, capexBudget: 1, opexBudget: 1 });

    const arg = (repo.upsertProjectBudget as jest.Mock).mock.calls[0][0];
    expect(arg.vendorBudget).toBeUndefined();
    expect(arg.currencyCode).toBeUndefined();
  });
});
