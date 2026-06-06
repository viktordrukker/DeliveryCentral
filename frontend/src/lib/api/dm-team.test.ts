import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as httpClient from './http-client';
import { fetchTeamConflicts, type TeamConflictsResponse } from './dm-team';

vi.mock('./http-client', async () => {
  const actual = await vi.importActual<typeof httpClient>('./http-client');
  return {
    ...actual,
    httpGet: vi.fn(),
  };
});

describe('fetchTeamConflicts (LEAN-P4-missing-8)', () => {
  beforeEach(() => {
    vi.mocked(httpClient.httpGet).mockReset();
  });

  it('GETs /dm-team/conflicts with no query string when asOf is omitted', async () => {
    const payload: TeamConflictsResponse = {
      asOf: '2026-06-10T00:00:00.000Z',
      conflicts: [],
    };
    vi.mocked(httpClient.httpGet).mockResolvedValueOnce(payload);

    const result = await fetchTeamConflicts();

    expect(httpClient.httpGet).toHaveBeenCalledWith('/dm-team/conflicts');
    expect(result).toEqual(payload);
  });

  it('passes asOf as a query param when supplied', async () => {
    const payload: TeamConflictsResponse = {
      asOf: '2026-06-10T00:00:00.000Z',
      conflicts: [
        {
          personId: 'person-1',
          personName: 'Alice Acker',
          weekStartIso: '2026-06-08T00:00:00.000Z',
          totalAllocationPct: 150,
          conflictPositions: [
            { positionId: 'pos-x', projectId: 'proj-a', projectCode: 'A', allocationPct: 100 },
            { positionId: 'pos-y', projectId: 'proj-b', projectCode: 'B', allocationPct: 50 },
          ],
        },
      ],
    };
    vi.mocked(httpClient.httpGet).mockResolvedValueOnce(payload);

    const result = await fetchTeamConflicts('2026-06-10T00:00:00.000Z');

    expect(httpClient.httpGet).toHaveBeenCalledWith(
      '/dm-team/conflicts?asOf=2026-06-10T00%3A00%3A00.000Z',
    );
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].totalAllocationPct).toBe(150);
  });
});
