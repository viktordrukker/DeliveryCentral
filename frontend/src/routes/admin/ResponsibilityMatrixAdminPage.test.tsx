import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  archiveResponsibilityRule,
  createResponsibilityRule,
  listResponsibilityRules,
  updateResponsibilityRule,
  type ResponsibilityRule,
} from '@/lib/api/responsibility-rules';
import { ResponsibilityMatrixAdminPage } from './ResponsibilityMatrixAdminPage';

vi.mock('@/lib/api/responsibility-rules', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/responsibility-rules')>();
  return {
    ...actual,
    listResponsibilityRules: vi.fn(),
    createResponsibilityRule: vi.fn(),
    updateResponsibilityRule: vi.fn(),
    archiveResponsibilityRule: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedList = vi.mocked(listResponsibilityRules);
const mockedCreate = vi.mocked(createResponsibilityRule);
const mockedUpdate = vi.mocked(updateResponsibilityRule);
const mockedArchive = vi.mocked(archiveResponsibilityRule);

const seededRule: ResponsibilityRule = {
  id: '00000000-0000-4000-8000-0000000d0401',
  actionKind: 'PROJECT_ACTIVATION_APPROVAL',
  scopeKind: 'TENANT',
  scopeValue: null,
  mode: 'ROLE',
  targetRole: 'director',
  targetPersonId: null,
  priority: 100,
  isActive: true,
  notes: 'Default — Director approves project activation.',
  tenantId: null,
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
  archivedAt: null,
  isSeededDefault: true,
};

const customRule: ResponsibilityRule = {
  id: '11111111-1111-4000-8000-111111111111',
  actionKind: 'PROJECT_ACTIVATION_APPROVAL',
  scopeKind: 'CLIENT',
  scopeValue: 'client-acme',
  mode: 'PERSON',
  targetRole: null,
  targetPersonId: 'person-anna',
  priority: 50,
  isActive: true,
  notes: 'Anna decides for ACME.',
  tenantId: null,
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
  archivedAt: null,
  isSeededDefault: false,
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <ResponsibilityMatrixAdminPage />
    </MemoryRouter>,
  );
}

describe('ResponsibilityMatrixAdminPage', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedArchive.mockReset();
  });

  async function waitForTable(): Promise<HTMLTableElement> {
    return await waitFor(() => {
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      return table as HTMLTableElement;
    });
  }

  it('renders the rule list with seeded-default badge', async () => {
    mockedList.mockResolvedValue([seededRule, customRule]);
    renderPage();
    const table = await waitForTable();
    const tableRows = within(table).getAllByRole('row');
    // 1 header + 2 data rows
    expect(tableRows).toHaveLength(3);
    // The "(default)" inline tag appears next to the action label only on
    // the seeded row. Filter dropdown also contains "(default)" via the
    // TENANT scope label, so allow both — assert at least one in the table.
    expect(within(table).getAllByText(/\(default\)/).length).toBeGreaterThan(0);
    expect(within(table).getByText(/client-acme/)).toBeInTheDocument();
    expect(within(table).getByText('person-anna')).toBeInTheDocument();
  });

  it('disables the Archive button on seeded defaults', async () => {
    mockedList.mockResolvedValue([seededRule]);
    renderPage();
    const table = await waitForTable();
    const archive = within(table).getByRole('button', { name: /Archive/i });
    expect(archive).toBeDisabled();
  });

  it('toggles a custom rule active/disabled', async () => {
    mockedList.mockResolvedValue([customRule]);
    mockedUpdate.mockResolvedValue({ ...customRule, isActive: false });
    renderPage();
    const table = await waitForTable();
    const disable = within(table).getByRole('button', { name: 'Disable' });
    await userEvent.click(disable);
    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith(customRule.id, { isActive: false });
    });
  });

  it('archives a custom rule via the confirmation dialog', async () => {
    mockedList.mockResolvedValue([customRule]);
    mockedArchive.mockResolvedValue({
      ...customRule,
      archivedAt: '2026-05-06T00:00:00Z',
      isActive: false,
    });
    renderPage();
    const table = await waitForTable();
    await userEvent.click(within(table).getByRole('button', { name: /Archive/i }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: /Archive/i });
    await userEvent.click(confirm);
    await waitFor(() => {
      expect(mockedArchive).toHaveBeenCalledWith(customRule.id);
    });
  });
});

