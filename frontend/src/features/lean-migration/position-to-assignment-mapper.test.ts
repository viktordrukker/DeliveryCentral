import { describe, expect, it } from 'vitest';

import type { ProjectPosition } from '@/lib/api/project-positions';

import {
  mapAssignmentStatusToFillStatus,
  mapFillStatusToAssignmentStatus,
  mapListResponseToDirectory,
  mapPositionToAssignmentResponse,
  mapPositionToDetails,
  mapPositionToDirectoryItem,
} from './position-to-assignment-mapper';

function buildPosition(overrides: Partial<ProjectPosition> = {}): ProjectPosition {
  return {
    id: 'pos-1',
    projectId: 'prj-1',
    role: 'Engineer',
    requiredAllocationPercent: 80,
    fillStatus: 'BOOKED',
    activePersonId: 'per-1',
    activeAllocationPercent: 80,
    version: 1,
    ...overrides,
  };
}

describe('position-to-assignment-mapper', () => {
  it('maps fillStatus → AssignmentStatus and back', () => {
    expect(mapFillStatusToAssignmentStatus('BOOKED')).toBe('BOOKED');
    expect(mapFillStatusToAssignmentStatus('OPEN')).toBe('CREATED');
    expect(mapFillStatusToAssignmentStatus('RELEASED')).toBe('CANCELLED');
    expect(mapAssignmentStatusToFillStatus('IN_REVIEW')).toBe('PROPOSED');
    expect(mapAssignmentStatusToFillStatus('COMPLETED')).toBe('RELEASED');
  });

  it('flattens a single position into AssignmentDirectoryItem shape', () => {
    const item = mapPositionToDirectoryItem(buildPosition());
    expect(item.id).toBe('pos-1');
    expect(item.allocationPercent).toBe(80);
    expect(item.approvalState).toBe('BOOKED');
    expect(item.person).toEqual({ id: 'per-1', displayName: 'per-1' });
    expect(item.project).toEqual({ id: 'prj-1', displayName: 'prj-1' });
    expect(item.staffingRole).toBe('Engineer');
  });

  it('defaults person/displayName when DTO does not carry it', () => {
    const item = mapPositionToDirectoryItem(
      buildPosition({ activePersonId: undefined, activeAllocationPercent: undefined }),
    );
    expect(item.person.id).toBe('');
    expect(item.person.displayName).toBe('');
    expect(item.allocationPercent).toBe(0);
  });

  it('maps list response into directory response shape', () => {
    const directory = mapListResponseToDirectory({
      positions: [buildPosition(), buildPosition({ id: 'pos-2' })],
      total: 2,
    });
    expect(directory.totalCount).toBe(2);
    expect(directory.items).toHaveLength(2);
    expect(directory.items[0].id).toBe('pos-1');
  });

  it('flattens a position into AssignmentDetails with derived capabilities', () => {
    const proposed = mapPositionToDetails(buildPosition({ fillStatus: 'PROPOSED' }));
    expect(proposed.canApprove).toBe(true);
    expect(proposed.canReject).toBe(true);
    expect(proposed.canEnd).toBe(false);
    expect(proposed.history).toEqual([]);
    expect(proposed.approvals).toEqual([]);

    const booked = mapPositionToDetails(buildPosition({ fillStatus: 'BOOKED' }));
    expect(booked.canApprove).toBe(false);
    expect(booked.canEnd).toBe(true);
  });

  it('flattens a position into ProjectAssignmentResponse envelope', () => {
    const response = mapPositionToAssignmentResponse(buildPosition());
    expect(response.id).toBe('pos-1');
    expect(response.status).toBe('BOOKED');
    expect(response.personId).toBe('per-1');
    expect(response.allocationPercent).toBe(80);
    expect(response.version).toBe(1);
  });

  // W1-10 — prefers enriched displayName projections (activePersonName /
  // projectName / projectCode) when the DTO carries them. Falls back to the
  // raw id so callers can detect unresolved rows and back-fill via the
  // person-directory.
  it('uses activePersonName / projectName when DTO is enriched', () => {
    const item = mapPositionToDirectoryItem(
      buildPosition({
        activePersonName: 'Ada Lovelace',
        projectName: 'Atlas ERP',
        projectCode: 'PRJ-102',
      }),
    );
    expect(item.person).toEqual({ id: 'per-1', displayName: 'Ada Lovelace' });
    expect(item.project).toEqual({ id: 'prj-1', displayName: 'Atlas ERP' });
  });

  it('prefers projectCode when projectName is missing on the DTO', () => {
    const item = mapPositionToDirectoryItem(
      buildPosition({ projectCode: 'PRJ-102' }),
    );
    expect(item.project.displayName).toBe('PRJ-102');
  });
});
