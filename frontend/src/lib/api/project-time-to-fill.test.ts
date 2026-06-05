import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as httpClient from './http-client';
import { fetchProjectTimeToFill, type ProjectTimeToFill } from './project-time-to-fill';

vi.mock('./http-client', async () => {
  const actual = await vi.importActual<typeof httpClient>('./http-client');
  return {
    ...actual,
    httpGet: vi.fn(),
  };
});

describe('fetchProjectTimeToFill', () => {
  beforeEach(() => {
    vi.mocked(httpClient.httpGet).mockReset();
  });

  it('GETs /projects/:id/metrics/time-to-fill and returns the payload', async () => {
    const payload: ProjectTimeToFill = {
      projectId: 'proj-1',
      positionCount: 3,
      filledCount: 2,
      medianDays: 9,
      positions: [],
    };
    vi.mocked(httpClient.httpGet).mockResolvedValueOnce(payload);

    const result = await fetchProjectTimeToFill('proj-1');

    expect(httpClient.httpGet).toHaveBeenCalledWith('/projects/proj-1/metrics/time-to-fill');
    expect(result).toEqual(payload);
  });
});
