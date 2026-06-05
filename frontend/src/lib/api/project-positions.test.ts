import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as httpClient from './http-client';
import {
  checkBench,
  createProjectPosition,
  fetchPersonSuggestedPositions,
  fetchPositionForensics,
  fetchProjectPosition,
  fetchProjectPositions,
  getPositionCandidates,
  getProjectPositionById,
  listProjectPositions,
  transitionProjectPosition,
  transitionProjectPositionFill,
  type PositionForensics,
  type ProjectPosition,
  type ProjectPositionFillStatus,
} from './project-positions';

vi.mock('./http-client', async () => {
  const actual = await vi.importActual<typeof httpClient>('./http-client');
  return {
    ...actual,
    httpGet: vi.fn(),
    httpPost: vi.fn(),
    httpPatch: vi.fn(),
    httpPut: vi.fn(),
    httpDelete: vi.fn(),
  };
});

const httpGet = httpClient.httpGet as unknown as ReturnType<typeof vi.fn>;
const httpPost = httpClient.httpPost as unknown as ReturnType<typeof vi.fn>;

function buildPosition(over: Partial<ProjectPosition> = {}): ProjectPosition {
  return {
    id: 'pos-1',
    projectId: 'proj-1',
    role: 'Senior Engineer',
    requiredAllocationPercent: 100,
    fillStatus: 'OPEN',
    version: 1,
    ...over,
  };
}

describe('listProjectPositions', () => {
  beforeEach(() => {
    httpGet.mockReset();
  });

  it('hits /project-positions with no query string when no filters', async () => {
    httpGet.mockResolvedValueOnce({ positions: [], total: 0 });

    const result = await listProjectPositions();

    expect(httpGet).toHaveBeenCalledWith('/project-positions');
    expect(result).toEqual({ positions: [], total: 0 });
  });

  it('encodes projectId + activePersonId + asOf + paging', async () => {
    httpGet.mockResolvedValueOnce({ positions: [], total: 0 });

    await listProjectPositions({
      projectId: 'proj-1',
      activePersonId: 'p-7',
      asOf: '2026-06-01',
      skip: 50,
      take: 25,
    });

    const call = httpGet.mock.calls[0][0] as string;
    expect(call).toContain('projectId=proj-1');
    expect(call).toContain('activePersonId=p-7');
    expect(call).toContain('asOf=2026-06-01');
    expect(call).toContain('skip=50');
    expect(call).toContain('take=25');
  });

  it('serialises fillStatuses as repeated query params', async () => {
    httpGet.mockResolvedValueOnce({ positions: [], total: 0 });

    await listProjectPositions({
      fillStatuses: ['OPEN', 'PROPOSED', 'BOOKED'],
    });

    const call = httpGet.mock.calls[0][0] as string;
    expect(call).toMatch(/fillStatuses=OPEN/);
    expect(call).toMatch(/fillStatuses=PROPOSED/);
    expect(call).toMatch(/fillStatuses=BOOKED/);
  });

  it('passes through the response shape verbatim', async () => {
    const position = buildPosition({ fillStatus: 'BOOKED', activePersonId: 'p-2' });
    httpGet.mockResolvedValueOnce({ positions: [position], total: 1 });

    const result = await listProjectPositions({ projectId: 'proj-1' });

    expect(result.positions[0]).toEqual(position);
    expect(result.total).toBe(1);
  });

  it('propagates errors from the http client', async () => {
    httpGet.mockRejectedValueOnce(new Error('boom'));

    await expect(listProjectPositions()).rejects.toThrow('boom');
  });

  it('fetchProjectPositions is the canonical alias for listProjectPositions', () => {
    expect(fetchProjectPositions).toBe(listProjectPositions);
  });
});

describe('getProjectPositionById / fetchProjectPosition', () => {
  beforeEach(() => {
    httpGet.mockReset();
  });

  it('hits /project-positions/:id', async () => {
    const position = buildPosition();
    httpGet.mockResolvedValueOnce(position);

    const result = await getProjectPositionById('pos-1');

    expect(httpGet).toHaveBeenCalledWith('/project-positions/pos-1');
    expect(result).toEqual(position);
  });

  it('fetchProjectPosition is the canonical alias', () => {
    expect(fetchProjectPosition).toBe(getProjectPositionById);
  });
});

describe('createProjectPosition', () => {
  beforeEach(() => {
    httpPost.mockReset();
  });

  it('POSTs the create payload verbatim', async () => {
    const position = buildPosition({ fillStatus: 'OPEN' });
    httpPost.mockResolvedValueOnce(position);

    const result = await createProjectPosition({
      projectId: 'proj-1',
      role: 'Senior Engineer',
      requiredAllocationPercent: 100,
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      skills: ['React'],
      openImmediately: true,
    });

    expect(httpPost).toHaveBeenCalledWith('/project-positions', {
      projectId: 'proj-1',
      role: 'Senior Engineer',
      requiredAllocationPercent: 100,
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      skills: ['React'],
      openImmediately: true,
    });
    expect(result).toEqual(position);
  });
});

describe('transitionProjectPositionFill / transitionProjectPosition', () => {
  beforeEach(() => {
    httpPost.mockReset();
  });

  it('POSTs to /:id/transition with the request body', async () => {
    const position = buildPosition({ fillStatus: 'BOOKED', activePersonId: 'p-2' });
    httpPost.mockResolvedValueOnce(position);

    const toStatus: ProjectPositionFillStatus = 'BOOKED';
    const result = await transitionProjectPositionFill('pos-1', {
      toStatus,
      personId: 'p-2',
      allocationPercent: 80,
    });

    expect(httpPost).toHaveBeenCalledWith('/project-positions/pos-1/transition', {
      toStatus: 'BOOKED',
      personId: 'p-2',
      allocationPercent: 80,
    });
    expect(result).toEqual(position);
  });

  it('transitionProjectPosition is the canonical alias', () => {
    expect(transitionProjectPosition).toBe(transitionProjectPositionFill);
  });
});

describe('getPositionCandidates', () => {
  beforeEach(() => {
    httpGet.mockReset();
  });

  it('appends limit when supplied', async () => {
    httpGet.mockResolvedValueOnce({
      positionId: 'pos-1',
      requiredSkills: [],
      candidates: [],
    });

    await getPositionCandidates('pos-1', 10);

    expect(httpGet).toHaveBeenCalledWith('/project-positions/pos-1/candidates?limit=10');
  });

  it('omits limit when not supplied', async () => {
    httpGet.mockResolvedValueOnce({
      positionId: 'pos-1',
      requiredSkills: [],
      candidates: [],
    });

    await getPositionCandidates('pos-1');

    expect(httpGet).toHaveBeenCalledWith('/project-positions/pos-1/candidates');
  });
});

describe('fetchPersonSuggestedPositions', () => {
  beforeEach(() => {
    httpGet.mockReset();
  });

  it('hits /people/:id/suggested-positions', async () => {
    httpGet.mockResolvedValueOnce({ personId: 'p-1', candidates: [] });

    await fetchPersonSuggestedPositions('p-1', 5);

    expect(httpGet).toHaveBeenCalledWith('/people/p-1/suggested-positions?limit=5');
  });
});

describe('checkBench', () => {
  beforeEach(() => {
    httpPost.mockReset();
  });

  it('POSTs personIds + asOf', async () => {
    httpPost.mockResolvedValueOnce({ people: [] });

    await checkBench(['p-1', 'p-2'], '2026-06-01');

    expect(httpPost).toHaveBeenCalledWith('/people/bench/check', {
      personIds: ['p-1', 'p-2'],
      asOf: '2026-06-01',
    });
  });
});

describe('fetchPositionForensics (LEAN-P4b-2)', () => {
  beforeEach(() => {
    httpGet.mockReset();
  });

  it('hits /project-positions/:id/forensics and returns the payload', async () => {
    const payload: PositionForensics = {
      positionId: 'pos-1',
      projectId: 'proj-1',
      role: 'Engineer',
      currentStatus: 'OPEN',
      events: [
        {
          id: 'h1',
          changeType: 'OPENED',
          previousStatus: 'DRAFT',
          newStatus: 'OPEN',
          previousPersonId: null,
          newPersonId: null,
          changedByPersonId: 'pm-1',
          changeReason: null,
          occurredAt: '2026-06-01T00:00:00.000Z',
          dwellMs: 432_000_000,
          longDwell: false,
        },
      ],
      asOf: '2026-06-06T00:00:00.000Z',
    };
    httpGet.mockResolvedValueOnce(payload);

    const result = await fetchPositionForensics('pos-1');

    expect(httpGet).toHaveBeenCalledWith('/project-positions/pos-1/forensics');
    expect(result).toEqual(payload);
  });
});
