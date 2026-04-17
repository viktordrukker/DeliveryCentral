import {
  PersonDirectoryItem,
  PersonDirectoryResponse,
} from '@/lib/api/person-directory';

export function buildPersonDirectoryItem(
  overrides: Partial<PersonDirectoryItem> = {},
): PersonDirectoryItem {
  return {
    currentAssignmentCount: 2,
    currentLineManager: { displayName: 'Sophia Kim', id: 'manager-1' },
    currentOrgUnit: {
      code: 'DEP-APP',
      id: 'org-application-engineering',
      name: 'Application Engineering',
    },
    displayName: 'Ethan Brooks',
    dottedLineManagers: [{ displayName: 'Lucas Reed', id: 'manager-2' }],
    grade: null,
    hiredAt: '2025-01-15T00:00:00.000Z',
    id: 'person-ethan-brooks',
    lifecycleStatus: 'ACTIVE',
    primaryEmail: 'ethan.brooks@example.com',
    resourcePoolIds: ['pool-platform-engineering'],
    role: null,
    resourcePools: [{ id: 'pool-platform-engineering', name: 'Platform Engineering Pool' }],
    terminatedAt: null,
    ...overrides,
  };
}

export function buildPersonDirectoryResponse(
  overrides: Partial<PersonDirectoryResponse> = {},
): PersonDirectoryResponse {
  const items = overrides.items ?? [buildPersonDirectoryItem()];

  return {
    items,
    page: overrides.page ?? 1,
    pageSize: overrides.pageSize ?? 10,
    total: overrides.total ?? items.length,
  };
}
