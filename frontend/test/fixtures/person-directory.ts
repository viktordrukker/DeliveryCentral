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
    id: 'person-ethan-brooks',
    lifecycleStatus: 'ACTIVE',
    primaryEmail: 'ethan.brooks@example.com',
    resourcePoolIds: ['pool-platform-engineering'],
    resourcePools: [{ id: 'pool-platform-engineering', name: 'Platform Engineering Pool' }],
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
