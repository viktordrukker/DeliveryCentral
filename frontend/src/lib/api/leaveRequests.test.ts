/**
 * LEAN-P4-missing-11 — leaveRequests API surface tests.
 *
 * Covers the two new endpoints (previewLeave, cancelLeaveRequest) with
 * URL and body shape assertions so the contract stays stable.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as httpClient from './http-client';
import {
  cancelLeaveRequest,
  previewLeave,
  type LeaveImpactPreviewDto,
  type LeaveRequestDto,
} from './leaveRequests';

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
const httpDelete = httpClient.httpDelete as unknown as ReturnType<typeof vi.fn>;

describe('previewLeave', () => {
  beforeEach(() => {
    httpGet.mockReset();
  });

  it('passes startDate, endDate, and type as query params', async () => {
    const dto: LeaveImpactPreviewDto = {
      workingDaysRequested: 5,
      skippedHolidays: [],
      balanceAfter: 15,
      conflictingAssignmentIds: [],
      conflictingTeamLeaveIds: [],
    };
    httpGet.mockResolvedValueOnce(dto);

    const result = await previewLeave({
      startDate: '2026-06-15',
      endDate: '2026-06-19',
      type: 'ANNUAL',
    });

    expect(httpGet).toHaveBeenCalledWith(
      '/leave-requests/preview?startDate=2026-06-15&endDate=2026-06-19&type=ANNUAL',
    );
    expect(result).toEqual(dto);
  });

  it('appends personId when supplied (manager preview on behalf)', async () => {
    httpGet.mockResolvedValueOnce({
      workingDaysRequested: 1,
      skippedHolidays: [],
      balanceAfter: null,
      conflictingAssignmentIds: [],
      conflictingTeamLeaveIds: [],
    });

    await previewLeave({
      startDate: '2026-07-04',
      endDate: '2026-07-04',
      type: 'SICK',
      personId: 'p-employee',
    });

    expect(httpGet).toHaveBeenCalledWith(
      '/leave-requests/preview?startDate=2026-07-04&endDate=2026-07-04&type=SICK&personId=p-employee',
    );
  });
});

describe('cancelLeaveRequest', () => {
  beforeEach(() => {
    httpDelete.mockReset();
  });

  it('issues DELETE /leave-requests/:id and returns the updated request', async () => {
    const dto: LeaveRequestDto = {
      id: 'lr-1',
      personId: 'p-employee',
      type: 'ANNUAL',
      status: 'CANCELLED',
      startDate: '2026-06-15',
      endDate: '2026-06-19',
      notes: null,
      reviewedAt: null,
      reviewedBy: null,
      reviewComment: null,
      createdAt: '2026-05-01T00:00:00.000Z',
    };
    httpDelete.mockResolvedValueOnce(dto);

    const result = await cancelLeaveRequest('lr-1');

    expect(httpDelete).toHaveBeenCalledWith('/leave-requests/lr-1');
    expect(result.status).toBe('CANCELLED');
  });
});
