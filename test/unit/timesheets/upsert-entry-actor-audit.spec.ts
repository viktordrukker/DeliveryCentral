import { TimesheetRepository } from '@src/modules/timesheets/infrastructure/timesheet.repository';
import type { PrismaService } from '@src/shared/persistence/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * F-94 / D-103-write-path round 4 — asserts that `createdByPersonId` /
 * `updatedByPersonId` are populated on TimesheetEntry upserts.
 *
 * Mocks PrismaService to capture the upsert args. Two scenarios:
 *   1. With actorId supplied → both create+update populate the cols.
 *   2. Legacy caller (no actorId) → both stay NULL (back-compat).
 */
describe('D-103 write-path — TimesheetEntry createdByPersonId / updatedByPersonId', () => {
  const baseArgs = () => ({
    timesheetWeekId: 'week-1',
    projectId: 'proj-1',
    date: new Date('2026-05-22'),
    hours: new Prisma.Decimal(8),
    capex: false,
    description: 'Coding',
  });

  it('passes actorId as createdByPersonId + updatedByPersonId in the create branch', async () => {
    let capturedUpsert: { create?: Record<string, unknown>; update?: Record<string, unknown> } | undefined;

    const prismaStub = {
      timesheetEntry: {
        upsert: async (args: typeof capturedUpsert) => {
          capturedUpsert = args;
          return { id: 'entry-1' };
        },
      },
    } as unknown as PrismaService;

    const repo = new TimesheetRepository(prismaStub);
    const a = baseArgs();
    await repo.upsertEntry(
      a.timesheetWeekId,
      a.projectId,
      a.date,
      a.hours,
      a.capex,
      a.description,
      undefined,
      undefined,
      undefined,
      'pm-actor-7', // actorId
    );

    expect(capturedUpsert?.create?.createdByPersonId).toBe('pm-actor-7');
    expect(capturedUpsert?.create?.updatedByPersonId).toBe('pm-actor-7');
    expect(capturedUpsert?.update?.updatedByPersonId).toBe('pm-actor-7');
  });

  it('leaves cols NULL when actorId is not supplied (legacy callers)', async () => {
    let capturedUpsert: { create?: Record<string, unknown>; update?: Record<string, unknown> } | undefined;

    const prismaStub = {
      timesheetEntry: {
        upsert: async (args: typeof capturedUpsert) => {
          capturedUpsert = args;
          return { id: 'entry-1' };
        },
      },
    } as unknown as PrismaService;

    const repo = new TimesheetRepository(prismaStub);
    const a = baseArgs();
    await repo.upsertEntry(
      a.timesheetWeekId,
      a.projectId,
      a.date,
      a.hours,
      a.capex,
      a.description,
    );

    expect(capturedUpsert?.create?.createdByPersonId).toBeNull();
    expect(capturedUpsert?.create?.updatedByPersonId).toBeNull();
    expect(capturedUpsert?.update?.updatedByPersonId).toBeNull();
  });
});
