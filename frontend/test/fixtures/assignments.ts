import { CreateAssignmentRequest, ProjectAssignmentResponse } from '@/lib/api/assignments';
import { buildPersonDirectoryItem } from './person-directory';
import { buildProjectDirectoryItem } from './project-registry';

export function buildCreateAssignmentOptionsFixture() {
  return {
    people: [
      buildPersonDirectoryItem({
        currentAssignmentCount: 2,
        displayName: 'Ethan Brooks',
        dottedLineManagers: [],
        id: 'person-1',
        primaryEmail: 'ethan@example.com',
      }),
      buildPersonDirectoryItem({
        currentAssignmentCount: 1,
        currentLineManager: { displayName: 'Noah Bennett', id: 'manager-3' },
        currentOrgUnit: { code: 'DEP-PMO', id: 'org-pmo', name: 'Program Management Office' },
        displayName: 'Lucas Reed',
        dottedLineManagers: [],
        id: 'person-2',
        primaryEmail: 'lucas@example.com',
        resourcePoolIds: ['pool-delivery-management'],
      }),
    ],
    projects: [
      buildProjectDirectoryItem({
        id: 'project-1',
      }),
    ],
  };
}

export function buildCreateAssignmentRequest(
  overrides: Partial<CreateAssignmentRequest> = {},
): CreateAssignmentRequest {
  return {
    actorId: 'person-2',
    allocationPercent: 50,
    note: 'Primary engineering assignment.',
    personId: 'person-1',
    projectId: 'project-1',
    staffingRole: 'Lead Engineer',
    startDate: '2025-04-01',
    ...overrides,
  };
}

export function buildCreateAssignmentResponse(
  overrides: Partial<ProjectAssignmentResponse> = {},
): ProjectAssignmentResponse {
  return {
    allocationPercent: 50,
    id: 'assignment-1',
    personId: 'person-1',
    projectId: 'project-1',
    requestedAt: '2025-03-10T10:00:00.000Z',
    staffingRole: 'Lead Engineer',
    startDate: '2025-04-01',
    status: 'REQUESTED',
    ...overrides,
  };
}
