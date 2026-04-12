import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  createMetadataDictionaryEntry,
  fetchMetadataDictionaryById,
  fetchMetadataDictionaries,
} from '@/lib/api/metadata';
import { DictionariesPage } from './DictionariesPage';

vi.mock('@/lib/api/metadata', () => ({
  createMetadataDictionaryEntry: vi.fn(),
  fetchMetadataDictionaryById: vi.fn(),
  fetchMetadataDictionaries: vi.fn(),
}));

const mockedCreateMetadataDictionaryEntry = vi.mocked(createMetadataDictionaryEntry);
const mockedFetchMetadataDictionaryById = vi.mocked(fetchMetadataDictionaryById);
const mockedFetchMetadataDictionaries = vi.mocked(fetchMetadataDictionaries);

describe('DictionariesPage', () => {
  beforeEach(() => {
    mockedCreateMetadataDictionaryEntry.mockReset();
    mockedFetchMetadataDictionaryById.mockReset();
    mockedFetchMetadataDictionaries.mockReset();
  });

  it('loads dictionaries and renders entries', async () => {
    mockDictionaryLoad();

    renderWithRouter();

    expect(await screen.findByText('Dictionaries')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Grade/i })).toBeInTheDocument();
    expect(await screen.findByText('Senior Consultant')).toBeInTheDocument();
  });

  it('creates a new entry through the metadata API', async () => {
    mockDictionaryLoad();
    mockedCreateMetadataDictionaryEntry.mockResolvedValue({
      archivedAt: null,
      displayName: 'Principal Consultant',
      entryKey: 'principal-consultant',
      entryValue: 'PRINCIPAL_CONSULTANT',
      id: 'entry-2',
      isEnabled: true,
      sortOrder: 2,
    });
    mockedFetchMetadataDictionaryById
      .mockResolvedValueOnce(buildDictionaryDetails())
      .mockResolvedValueOnce(
        buildDictionaryDetails({
          entries: [
            ...buildDictionaryDetails().entries,
            {
              archivedAt: null,
              displayName: 'Principal Consultant',
              entryKey: 'principal-consultant',
              entryValue: 'PRINCIPAL_CONSULTANT',
              id: 'entry-2',
              isEnabled: true,
              sortOrder: 2,
            },
          ],
          entryCount: 2,
          enabledEntryCount: 2,
        }),
      );
    mockedFetchMetadataDictionaries
      .mockResolvedValueOnce(buildDictionaryListResponse())
      .mockResolvedValueOnce(buildDictionaryListResponse(2, 2));

    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Senior Consultant');

    await user.type(screen.getByLabelText('Display Name'), 'Principal Consultant');
    await user.type(screen.getByLabelText('Entry Key'), 'principal-consultant');
    await user.type(screen.getByLabelText('Entry Value'), 'PRINCIPAL_CONSULTANT');
    await user.click(screen.getByRole('button', { name: 'Add entry' }));

    await waitFor(() => {
      expect(mockedCreateMetadataDictionaryEntry).toHaveBeenCalledWith('grade', {
        displayName: 'Principal Consultant',
        entryKey: 'principal-consultant',
        entryValue: 'PRINCIPAL_CONSULTANT',
      });
    });

    expect(await screen.findByText('Created dictionary entry Principal Consultant.')).toBeInTheDocument();
    expect(await screen.findByText('Principal Consultant')).toBeInTheDocument();
  });
});

function buildDictionaryListResponse(entryCount = 1, enabledEntryCount = 1) {
  return {
    items: [
      {
        description: 'Employee grade definitions.',
        dictionaryKey: 'grade',
        displayName: 'Grade',
        enabledEntryCount,
        entityType: 'Person',
        entryCount,
        id: 'dict-grade',
        isArchived: false,
        isSystemManaged: false,
        relatedCustomFieldCount: 0,
        scopeOrgUnitId: null,
        workflowUsageCount: 0,
      },
      {
        description: 'Employee role definitions.',
        dictionaryKey: 'role',
        displayName: 'Role',
        enabledEntryCount: 1,
        entityType: 'Person',
        entryCount: 1,
        id: 'dict-role',
        isArchived: false,
        isSystemManaged: false,
        relatedCustomFieldCount: 0,
        scopeOrgUnitId: null,
        workflowUsageCount: 0,
      },
    ],
  };
}

function buildDictionaryDetails(
  overrides: Partial<ReturnType<typeof baseDictionaryDetails>> = {},
) {
  return {
    ...baseDictionaryDetails(),
    ...overrides,
  };
}

function baseDictionaryDetails() {
  return {
    description: 'Employee grade definitions.',
    dictionaryKey: 'grade',
    displayName: 'Grade',
    enabledEntryCount: 1,
    entries: [
      {
        archivedAt: null,
        displayName: 'Senior Consultant',
        entryKey: 'senior-consultant',
        entryValue: 'SENIOR_CONSULTANT',
        id: 'entry-1',
        isEnabled: true,
        sortOrder: 1,
      },
    ],
    entityType: 'Person',
    entryCount: 1,
    id: 'dict-grade',
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

function mockDictionaryLoad(): void {
  mockedFetchMetadataDictionaries.mockResolvedValue(buildDictionaryListResponse());
  mockedFetchMetadataDictionaryById.mockResolvedValue(buildDictionaryDetails());
}

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/admin/dictionaries']}>
      <Routes>
        <Route element={<DictionariesPage />} path="/admin/dictionaries" />
      </Routes>
    </MemoryRouter>,
  );
}
