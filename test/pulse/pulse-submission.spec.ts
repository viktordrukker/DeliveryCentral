import { PulseService } from '@src/modules/pulse/application/pulse.service';
import { PulseRepository } from '@src/modules/pulse/infrastructure/pulse.repository';

function makeRecord(weekStart: Date, mood: number, note?: string) {
  return {
    id: 'pulse-1',
    personId: 'person-1',
    weekStart,
    mood,
    note: note ?? null,
    submittedAt: new Date('2026-04-06T09:00:00Z'),
  };
}

function buildMockRepo(overrides: Partial<PulseRepository> = {}): PulseRepository {
  return {
    upsert: jest.fn(),
    findHistory: jest.fn().mockResolvedValue([]),
    findForPeople: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as PulseRepository;
}

/**
 * Returns the ISO Monday (YYYY-MM-DD) for the week containing the given date.
 * Mirror of the private helper in pulse.service.ts — used to compute expected values.
 */
function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

describe('PulseService — submit (one-per-week idempotency)', () => {
  it('calls upsert with the Monday of the current week', async () => {
    const now = new Date();
    const expectedMonday = getMondayOfWeek(now);

    const upsertMock = jest.fn().mockResolvedValue(makeRecord(new Date(expectedMonday), 4));
    const repo = buildMockRepo({ upsert: upsertMock });
    const svc = new PulseService(repo);

    await svc.submit('person-1', { mood: 4 });

    expect(upsertMock).toHaveBeenCalledWith(
      'person-1',
      expect.objectContaining({
        // weekStart should be the Monday at midnight UTC
        toISOString: expect.any(Function),
      }),
      4,
      undefined,
    );

    // Verify the weekStart is a Monday
    const calledWeekStart: Date = upsertMock.mock.calls[0][1];
    expect(calledWeekStart.getUTCDay()).toBe(1); // 1 = Monday
  });

  it('returns entry with weekStart matching the Monday of current week', async () => {
    const now = new Date();
    const expectedMonday = getMondayOfWeek(now);
    const mondayDate = new Date(expectedMonday);
    const repo = buildMockRepo({
      upsert: jest.fn().mockResolvedValue(makeRecord(mondayDate, 3, 'Feeling okay')),
    });
    const svc = new PulseService(repo);

    const result = await svc.submit('person-1', { mood: 3, note: 'Feeling okay' });

    expect(result.weekStart).toBe(expectedMonday);
    expect(result.mood).toBe(3);
    expect(result.note).toBe('Feeling okay');
  });

  it('submitting twice in the same week uses the same weekStart (upsert key)', async () => {
    const now = new Date();
    const expectedMonday = getMondayOfWeek(now);
    const mondayDate = new Date(expectedMonday);

    const upsertMock = jest.fn()
      .mockResolvedValueOnce(makeRecord(mondayDate, 2))
      .mockResolvedValueOnce(makeRecord(mondayDate, 4));

    const repo = buildMockRepo({ upsert: upsertMock });
    const svc = new PulseService(repo);

    await svc.submit('person-1', { mood: 2 });
    await svc.submit('person-1', { mood: 4 });

    expect(upsertMock).toHaveBeenCalledTimes(2);

    const firstWeekStart: Date = upsertMock.mock.calls[0][1];
    const secondWeekStart: Date = upsertMock.mock.calls[1][1];

    // Same Monday for both calls — idempotency key is the same
    expect(firstWeekStart.getTime()).toBe(secondWeekStart.getTime());
  });

  it('second submission overwrites mood with the updated value', async () => {
    const now = new Date();
    const mondayDate = new Date(getMondayOfWeek(now));

    const upsertMock = jest.fn()
      .mockResolvedValueOnce(makeRecord(mondayDate, 2))
      .mockResolvedValueOnce(makeRecord(mondayDate, 5));

    const repo = buildMockRepo({ upsert: upsertMock });
    const svc = new PulseService(repo);

    await svc.submit('person-1', { mood: 2 });
    const second = await svc.submit('person-1', { mood: 5 });

    // The returned entry reflects the new mood
    expect(second.mood).toBe(5);
  });

  it('passes note to upsert when provided', async () => {
    const upsertMock = jest.fn().mockResolvedValue(makeRecord(new Date(), 3, 'Good week'));
    const repo = buildMockRepo({ upsert: upsertMock });
    const svc = new PulseService(repo);

    await svc.submit('person-1', { mood: 3, note: 'Good week' });

    expect(upsertMock).toHaveBeenCalledWith(
      'person-1',
      expect.any(Date),
      3,
      'Good week',
    );
  });
});

describe('PulseService — getMyHistory', () => {
  it('returns frequency = weekly', async () => {
    const repo = buildMockRepo({ findHistory: jest.fn().mockResolvedValue([]) });
    const svc = new PulseService(repo);

    const result = await svc.getMyHistory('person-1', 4);

    expect(result.frequency).toBe('weekly');
    expect(result.entries).toHaveLength(0);
  });
});
