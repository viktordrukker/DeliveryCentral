import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { createEmployee, fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchMetadataDictionaries, fetchMetadataDictionaryById } from '@/lib/api/metadata';
import { fetchOrgChart } from '@/lib/api/org-chart';
import { renderRoute } from '@test/render-route';
import { EmployeeLifecycleAdminPage } from './EmployeeLifecycleAdminPage';

vi.mock('@/lib/api/person-directory', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/person-directory')>(
    '@/lib/api/person-directory',
  );

  return {
    ...actual,
    createEmployee: vi.fn(),
    fetchPersonDirectory: vi.fn(),
  };
});

vi.mock('@/lib/api/metadata', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/metadata')>('@/lib/api/metadata');

  return {
    ...actual,
    fetchMetadataDictionaries: vi.fn(),
    fetchMetadataDictionaryById: vi.fn(),
  };
});

vi.mock('@/lib/api/org-chart', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/org-chart')>('@/lib/api/org-chart');

  return {
    ...actual,
    fetchOrgChart: vi.fn(),
  };
});

const mockedCreateEmployee = vi.mocked(createEmployee);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchMetadataDictionaries = vi.mocked(fetchMetadataDictionaries);
const mockedFetchMetadataDictionaryById = vi.mocked(fetchMetadataDictionaryById);
const mockedFetchOrgChart = vi.mocked(fetchOrgChart);

describe('EmployeeLifecycleAdminPage', () => {
  beforeEach(() => {
    mockedCreateEmployee.mockReset();
    mockedFetchPersonDirectory.mockReset();
    mockedFetchMetadataDictionaries.mockReset();
    mockedFetchMetadataDictionaryById.mockReset();
    mockedFetchOrgChart.mockReset();
    window.localStorage.clear();

    mockedFetchPersonDirectory.mockResolvedValue({
      items: [{ currentAssignmentCount: 0, currentLineManager: null, currentOrgUnit: null, displayName: 'Alice Manager', dottedLineManagers: [], id: 'person-mgr-1', lifecycleStatus: 'ACTIVE', primaryEmail: 'alice@example.com', resourcePoolIds: [], resourcePools: [] }],
      page: 1,
      pageSize: 500,
      total: 1,
    });

    mockedFetchOrgChart.mockResolvedValue({
      dottedLineRelationships: [],
      roots: [
        {
          children: [],
          code: 'DEP-APP',
          id: 'org-app',
          kind: 'ORG_UNIT',
          manager: null,
          members: [],
          name: 'Application Engineering',
        },
      ],
    });
    mockedFetchMetadataDictionaries.mockResolvedValue({
      items: [
        buildDictionarySummary('dict-grade', 'grade', 'Grade'),
        buildDictionarySummary('dict-role', 'role', 'Role'),
        buildDictionarySummary('dict-skillset', 'skillset', 'Skillset'),
      ],
    });
    mockedFetchMetadataDictionaryById.mockImplementation(async (id: string) => {
      if (id === 'dict-grade') {
        return buildDictionaryDetails('dict-grade', 'grade', 'Grade', [
          buildEntry('entry-grade', 'Senior Consultant', 'SENIOR_CONSULTANT'),
        ]);
      }

      if (id === 'dict-role') {
        return buildDictionaryDetails('dict-role', 'role', 'Role', [
          buildEntry('entry-role', 'Delivery Manager', 'DELIVERY_MANAGER'),
        ]);
      }

      return buildDictionaryDetails('dict-skillset', 'skillset', 'Skillset', [
        buildEntry('entry-skill', 'Data Engineering', 'DATA_ENGINEERING'),
      ]);
    });
  });

  it('renders and submits the create employee flow', async () => {
    mockedCreateEmployee.mockResolvedValue({
      email: 'casey.nguyen@example.com',
      grade: 'SENIOR_CONSULTANT',
      id: 'employee-1',
      name: 'Casey Nguyen',
      orgUnitId: 'org-app',
      role: 'DELIVERY_MANAGER',
      skillsets: ['DATA_ENGINEERING'],
      status: 'INACTIVE',
    });

    const { user } = renderWithRouter();

    expect(await screen.findByText('Employee Lifecycle Admin')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), 'Casey Nguyen');
    await user.type(screen.getByLabelText('Email'), 'casey.nguyen@example.com');
    await user.selectOptions(screen.getByLabelText('Org Unit'), 'org-app');
    await user.selectOptions(screen.getByLabelText('Grade'), 'SENIOR_CONSULTANT');
    await user.selectOptions(screen.getByLabelText('Role'), 'DELIVERY_MANAGER');
    await user.click(screen.getByLabelText(/Data Engineering/i));
    await user.click(screen.getByRole('button', { name: 'Create employee' }));

    // ConfirmDialog now shows — click Confirm to proceed
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockedCreateEmployee).toHaveBeenCalledWith({
        email: 'casey.nguyen@example.com',
        grade: 'SENIOR_CONSULTANT',
        name: 'Casey Nguyen',
        orgUnitId: 'org-app',
        role: 'DELIVERY_MANAGER',
        skillsets: ['DATA_ENGINEERING'],
      });
    });

    expect(await screen.findByText('Employee Profile')).toBeInTheDocument();
  });

  it('shows validation errors after confirming the dialog', async () => {
    const { user } = renderWithRouter();

    await screen.findByText('Employee Lifecycle Admin');
    await user.type(screen.getByLabelText('Email'), 'bad-email');
    await user.click(screen.getByRole('button', { name: 'Create employee' }));

    // ConfirmDialog appears — confirm to proceed to validation
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Email must be valid.')).toBeInTheDocument();
    expect(screen.getByText('Org unit is required.')).toBeInTheDocument();
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<EmployeeLifecycleAdminPage />} path="/admin/people/new" />
      <Route element={<div>Employee Profile</div>} path="/people/:id" />
    </Routes>,
    {
      initialEntries: ['/admin/people/new'],
    },
  );
}

function buildDictionarySummary(id: string, dictionaryKey: string, displayName: string) {
  return {
    description: `${displayName} definitions.`,
    dictionaryKey,
    displayName,
    enabledEntryCount: 1,
    entityType: 'Person',
    entryCount: 1,
    id,
    isArchived: false,
    isSystemManaged: false,
    relatedCustomFieldCount: 0,
    scopeOrgUnitId: null,
    workflowUsageCount: 0,
  };
}

function buildDictionaryDetails(
  id: string,
  dictionaryKey: string,
  displayName: string,
  entries: Array<ReturnType<typeof buildEntry>>,
) {
  return {
    description: `${displayName} definitions.`,
    dictionaryKey,
    displayName,
    enabledEntryCount: entries.length,
    entries,
    entityType: 'Person',
    entryCount: entries.length,
    id,
    isArchived: false,
    isSystemManaged: false,
    relatedCustomFieldCount: 0,
    relatedCustomFields: [],
    relatedLayouts: [],
    relatedWorkflows: [],
    scopeOrgUnitId: null,
    workflowUsageCount: 0,
  };
}

function buildEntry(id: string, displayName: string, entryValue: string) {
  return {
    archivedAt: null,
    displayName,
    entryKey: displayName.toLowerCase().replace(/\s+/g, '-'),
    entryValue,
    id,
    isEnabled: true,
    sortOrder: 1,
  };
}
