import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchMetadataDictionaries,
  fetchMetadataDictionaryById,
} from '@/lib/api/metadata';
import { MetadataAdminPage } from './MetadataAdminPage';

vi.mock('@/lib/api/metadata', () => ({
  fetchMetadataDictionaries: vi.fn(),
  fetchMetadataDictionaryById: vi.fn(),
}));

const mockedFetchMetadataDictionaries = vi.mocked(fetchMetadataDictionaries);
const mockedFetchMetadataDictionaryById = vi.mocked(fetchMetadataDictionaryById);

describe('MetadataAdminPage', () => {
  beforeEach(() => {
    mockedFetchMetadataDictionaries.mockReset();
    mockedFetchMetadataDictionaryById.mockReset();
  });

  it('shows loading state', () => {
    mockedFetchMetadataDictionaries.mockReturnValue(new Promise(() => undefined));

    renderWithRouter();

    expect(screen.getByText('Loading metadata dictionaries...')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockedFetchMetadataDictionaries.mockResolvedValue({ items: [] });

    renderWithRouter();

    expect(await screen.findByText('No dictionaries available')).toBeInTheDocument();
  });

  it('renders dictionaries and details', async () => {
    mockedFetchMetadataDictionaries.mockResolvedValue({
      items: [
        {
          description: 'Classification for project setup.',
          dictionaryKey: 'project-types',
          displayName: 'Project Types',
          enabledEntryCount: 2,
          entityType: 'Project',
          entryCount: 3,
          id: 'dict-1',
          isArchived: false,
          isSystemManaged: false,
          relatedCustomFieldCount: 1,
          scopeOrgUnitId: null,
          workflowUsageCount: 0,
        },
      ],
    });
    mockedFetchMetadataDictionaryById.mockResolvedValue({
      description: 'Classification for project setup.',
      dictionaryKey: 'project-types',
      displayName: 'Project Types',
      enabledEntryCount: 2,
      entries: [
        {
          archivedAt: null,
          displayName: 'Internal Initiative',
          entryKey: 'internal',
          entryValue: 'INTERNAL',
          id: 'entry-1',
          isEnabled: true,
          sortOrder: 1,
        },
      ],
      entityType: 'Project',
      entryCount: 3,
      id: 'dict-1',
      isArchived: false,
      isSystemManaged: false,
      relatedCustomFieldCount: 1,
      relatedCustomFields: [
        {
          dataType: 'ENUM',
          displayName: 'Project Type',
          entityType: 'Project',
          fieldKey: 'projectType',
          id: 'field-1',
          isRequired: true,
        },
      ],
      relatedLayouts: [
        {
          displayName: 'Project Summary Layout',
          entityType: 'Project',
          id: 'layout-1',
          isDefault: true,
          layoutKey: 'project-summary',
          version: 1,
        },
      ],
      relatedWorkflows: [],
      scopeOrgUnitId: null,
      workflowUsageCount: 0,
    });

    renderWithRouter();

    expect((await screen.findAllByText('Project Types')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Internal Initiative')).toBeInTheDocument();
    expect(screen.getByText('Project Type')).toBeInTheDocument();
    expect(screen.getByText('Project Summary Layout')).toBeInTheDocument();
  });

  it('shows API error state', async () => {
    mockedFetchMetadataDictionaries.mockRejectedValue(new Error('Metadata unavailable'));

    renderWithRouter();

    expect(await screen.findByText('Metadata unavailable')).toBeInTheDocument();
  });

  it('switches selected dictionary', async () => {
    mockedFetchMetadataDictionaries.mockResolvedValue({
      items: [
        {
          description: 'Project dictionary.',
          dictionaryKey: 'project-types',
          displayName: 'Project Types',
          enabledEntryCount: 2,
          entityType: 'Project',
          entryCount: 3,
          id: 'dict-1',
          isArchived: false,
          isSystemManaged: false,
          relatedCustomFieldCount: 1,
          scopeOrgUnitId: null,
          workflowUsageCount: 0,
        },
        {
          description: 'Case dictionary.',
          dictionaryKey: 'case-intake-channel',
          displayName: 'Case Intake Channels',
          enabledEntryCount: 2,
          entityType: 'Case',
          entryCount: 2,
          id: 'dict-2',
          isArchived: false,
          isSystemManaged: true,
          relatedCustomFieldCount: 0,
          scopeOrgUnitId: null,
          workflowUsageCount: 1,
        },
      ],
    });
    mockedFetchMetadataDictionaryById
      .mockResolvedValueOnce({
        description: 'Project dictionary.',
        dictionaryKey: 'project-types',
        displayName: 'Project Types',
        enabledEntryCount: 2,
        entries: [],
        entityType: 'Project',
        entryCount: 3,
        id: 'dict-1',
        isArchived: false,
        isSystemManaged: false,
        relatedCustomFieldCount: 1,
        relatedCustomFields: [],
        relatedLayouts: [],
        relatedWorkflows: [],
        scopeOrgUnitId: null,
        workflowUsageCount: 0,
      })
      .mockResolvedValueOnce({
        description: 'Case dictionary.',
        dictionaryKey: 'case-intake-channel',
        displayName: 'Case Intake Channels',
        enabledEntryCount: 2,
        entries: [
          {
            archivedAt: null,
            displayName: 'Manager Request',
            entryKey: 'manager-request',
            entryValue: 'MANAGER_REQUEST',
            id: 'entry-2',
            isEnabled: true,
            sortOrder: 1,
          },
        ],
        entityType: 'Case',
        entryCount: 2,
        id: 'dict-2',
        isArchived: false,
        isSystemManaged: true,
        relatedCustomFieldCount: 0,
        relatedCustomFields: [],
        relatedLayouts: [],
        relatedWorkflows: [
          {
            displayName: 'Onboarding Intake Workflow',
            entityType: 'Case',
            id: 'wf-1',
            status: 'ACTIVE',
            version: 2,
            workflowKey: 'onboarding-intake',
          },
        ],
        scopeOrgUnitId: null,
        workflowUsageCount: 1,
      });

    const user = userEvent.setup();
    renderWithRouter();

    await screen.findAllByText('Project Types');
    await user.click(screen.getByRole('button', { name: /Case Intake Channels/i }));

    expect(await screen.findByText('Manager Request')).toBeInTheDocument();
    expect(screen.getByText('Onboarding Intake Workflow')).toBeInTheDocument();
  });
});

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/metadata-admin']}>
      <Routes>
        <Route element={<MetadataAdminPage />} path="/metadata-admin" />
      </Routes>
    </MemoryRouter>,
  );
}
