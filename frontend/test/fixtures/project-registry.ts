import {
  ProjectDetails,
  ProjectDirectoryItem,
  ProjectDirectoryResponse,
} from '@/lib/api/project-registry';

export function buildProjectDirectoryItem(
  overrides: Partial<ProjectDirectoryItem> = {},
): ProjectDirectoryItem {
  return {
    assignmentCount: 3,
    externalLinksCount: 1,
    externalLinksSummary: [{ count: 1, provider: 'JIRA' }],
    id: 'project-atlas-erp-rollout',
    name: 'Atlas ERP Rollout',
    projectCode: 'PRJ-102',
    status: 'ACTIVE',
    ...overrides,
  };
}

export function buildProjectDirectoryResponse(
  overrides: Partial<ProjectDirectoryResponse> = {},
): ProjectDirectoryResponse {
  const items = overrides.items ?? [buildProjectDirectoryItem()];
  return {
    items,
    totalCount: overrides.totalCount ?? items.length,
  };
}

export function buildProjectDetails(
  overrides: Partial<ProjectDetails> = {},
): ProjectDetails {
  return {
    ...buildProjectDirectoryItem(),
    description: 'Enterprise rollout project.',
    externalLinks: [
      {
        archived: false,
        externalProjectKey: 'ATLAS',
        externalProjectName: 'Atlas ERP',
        externalUrl: 'https://jira.example.test/projects/ATLAS',
        provider: 'JIRA',
        providerEnvironment: 'cloud',
      },
    ],
    plannedEndDate: null,
    projectManagerDisplayName: null,
    projectManagerId: null,
    startDate: null,
    ...overrides,
  };
}
