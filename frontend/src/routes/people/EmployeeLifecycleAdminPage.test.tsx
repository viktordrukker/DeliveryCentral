import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { createEmployee, fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchMetadataDictionaries, fetchMetadataDictionaryById } from '@/lib/api/metadata';
import { fetchOrgChart } from '@/lib/api/org-chart';
import { fetchSkills, upsertPersonSkills } from '@/lib/api/skills';
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

vi.mock('@/lib/api/skills', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/skills')>('@/lib/api/skills');

  return {
    ...actual,
    fetchSkills: vi.fn(),
    upsertPersonSkills: vi.fn(),
  };
});

const mockedCreateEmployee = vi.mocked(createEmployee);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchMetadataDictionaries = vi.mocked(fetchMetadataDictionaries);
const mockedFetchMetadataDictionaryById = vi.mocked(fetchMetadataDictionaryById);
const mockedFetchOrgChart = vi.mocked(fetchOrgChart);
const mockedFetchSkills = vi.mocked(fetchSkills);
const mockedUpsertPersonSkills = vi.mocked(upsertPersonSkills);

describe('EmployeeLifecycleAdminPage', () => {
  beforeEach(() => {
    mockedCreateEmployee.mockReset();
    mockedFetchPersonDirectory.mockReset();
    mockedFetchMetadataDictionaries.mockReset();
    mockedFetchMetadataDictionaryById.mockReset();
    mockedFetchOrgChart.mockReset();
    mockedFetchSkills.mockReset();
    mockedUpsertPersonSkills.mockReset();
    window.localStorage.clear();

    mockedFetchPersonDirectory.mockResolvedValue({
      items: [{ currentAssignmentCount: 0, currentLineManager: null, currentOrgUnit: null, displayName: 'Alice Manager', dottedLineManagers: [], grade: null, id: 'person-mgr-1', lifecycleStatus: 'ACTIVE', primaryEmail: 'alice@example.com', resourcePoolIds: [], resourcePools: [], role: null, hiredAt: null, terminatedAt: null }],
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
      ],
    });
    mockedFetchMetadataDictionaryById.mockImplementation(async (id: string) => {
      if (id === 'dict-grade') {
        return buildDictionaryDetails('dict-grade', 'grade', 'Grade', [
          buildEntry('entry-grade', 'Senior Consultant', 'SENIOR_CONSULTANT'),
        ]);
      }

      return buildDictionaryDetails('dict-role', 'role', 'Role', [
        buildEntry('entry-role', 'Delivery Manager', 'DELIVERY_MANAGER'),
      ]);
    });
    mockedFetchSkills.mockResolvedValue([
      { id: 'skill-react', name: 'React', category: 'Frontend', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'skill-aws', name: 'AWS', category: 'Cloud', createdAt: '2026-01-01T00:00:00Z' },
    ]);
    mockedUpsertPersonSkills.mockResolvedValue([]);
  });

  it('creates an employee and writes picked skills to PersonSkill (not legacy Person.skillsets)', async () => {
    mockedCreateEmployee.mockResolvedValue({
      email: 'casey.nguyen@example.com',
      grade: 'SENIOR_CONSULTANT',
      id: 'employee-1',
      name: 'Casey Nguyen',
      orgUnitId: 'org-app',
      role: 'DELIVERY_MANAGER',
      skillsets: [],
      status: 'INACTIVE',
    });

    const { user } = renderWithRouter();

    expect(await screen.findByText('Employee Lifecycle Admin')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), 'Casey Nguyen');
    await user.type(screen.getByLabelText('Email'), 'casey.nguyen@example.com');
    await user.selectOptions(screen.getByLabelText('Org Unit'), 'org-app');
    await user.selectOptions(screen.getByLabelText('Grade'), 'SENIOR_CONSULTANT');
    await user.selectOptions(screen.getByLabelText('Role'), 'DELIVERY_MANAGER');
    await user.selectOptions(screen.getByTestId('skill-selector'), 'skill-react');
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
      });
    });

    // The legacy `skillsets` field must not be sent to the create endpoint.
    expect(mockedCreateEmployee.mock.calls[0]?.[0]).not.toHaveProperty('skillsets');

    // PersonSkill rows must be written for each picked skill.
    await waitFor(() => {
      expect(mockedUpsertPersonSkills).toHaveBeenCalledWith('employee-1', [
        { skillId: 'skill-react', proficiency: 3, certified: false },
      ]);
    });

    expect(await screen.findByText('Employee Profile')).toBeInTheDocument();
  });

  it('does not call upsertPersonSkills when no skills are picked', async () => {
    mockedCreateEmployee.mockResolvedValue({
      email: 'no.skills@example.com',
      grade: null,
      id: 'employee-2',
      name: 'No Skills',
      orgUnitId: 'org-app',
      role: null,
      skillsets: [],
      status: 'INACTIVE',
    });

    const { user } = renderWithRouter();

    await screen.findByText('Employee Lifecycle Admin');
    await user.type(screen.getByLabelText('Name'), 'No Skills');
    await user.type(screen.getByLabelText('Email'), 'no.skills@example.com');
    await user.selectOptions(screen.getByLabelText('Org Unit'), 'org-app');
    await user.click(screen.getByRole('button', { name: 'Create employee' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockedCreateEmployee).toHaveBeenCalled();
    });

    expect(mockedUpsertPersonSkills).not.toHaveBeenCalled();
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
