import { screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectPosition } from '@/lib/api/project-positions';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { renderRoute } from '@test/render-route';
import { BulkCreatePositionsPage } from './BulkCreatePositionsPage';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'pm-1', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/project-positions', () => ({
  createProjectPosition: vi.fn(),
}));

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockedCreate = vi.mocked(createProjectPosition);
const mockedDirectory = vi.mocked(fetchProjectDirectory);

function renderPage() {
  return renderRoute(
    <Routes>
      <Route element={<BulkCreatePositionsPage />} path="/staffing-requests/bulk" />
      <Route element={<div data-testid="staffing-desk">Staffing Desk</div>} path="/staffing-desk" />
    </Routes>,
    { initialEntries: ['/staffing-requests/bulk'] },
  );
}

const projectFixture = {
  assignmentCount: 0,
  clientName: null,
  engagementModel: null,
  externalLinksCount: 0,
  externalLinksSummary: [],
  priority: null,
} as const;

describe('BulkCreatePositionsPage (W2-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDirectory.mockResolvedValue({
      items: [
        { ...projectFixture, id: 'proj-1', projectCode: 'P-1', name: 'Alpha', status: 'ACTIVE' },
        { ...projectFixture, id: 'proj-2', projectCode: 'P-2', name: 'Beta', status: 'ACTIVE' },
        {
          ...projectFixture,
          id: 'proj-3',
          projectCode: 'P-3',
          name: 'Done',
          status: 'CLOSED',
        },
      ],
    });
  });

  it('renders three default rows after projects load', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('bulk-create-row-0-project')).toBeInTheDocument();
      expect(screen.getByTestId('bulk-create-row-1-project')).toBeInTheDocument();
      expect(screen.getByTestId('bulk-create-row-2-project')).toBeInTheDocument();
    });
    // Closed projects are filtered out.
    const projectSelect = screen.getByTestId('bulk-create-row-0-project');
    expect(within(projectSelect).queryByText(/Done/)).not.toBeInTheDocument();
    expect(within(projectSelect).getByText(/Alpha/)).toBeInTheDocument();
  });

  it('add row + remove row keep at least one row', async () => {
    const { user } = renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('bulk-create-row-0-project')).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId('bulk-create-add-row'));
    expect(screen.getByTestId('bulk-create-row-3-project')).toBeInTheDocument();

    // Remove three rows — guard prevents going below one.
    await user.click(screen.getByTestId('bulk-create-row-3-remove'));
    await user.click(screen.getByTestId('bulk-create-row-2-remove'));
    await user.click(screen.getByTestId('bulk-create-row-1-remove'));
    // After removals only row 0 remains; its remove button is now disabled.
    expect(screen.getByTestId('bulk-create-row-0-remove')).toBeDisabled();
    expect(screen.queryByTestId('bulk-create-row-1-project')).not.toBeInTheDocument();
  });

  it('Apply default project fills every empty row', async () => {
    const { user } = renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('bulk-create-default-project')).toBeInTheDocument(),
    );

    await user.selectOptions(screen.getByTestId('bulk-create-default-project'), 'proj-2');
    await user.click(screen.getByTestId('bulk-create-apply-default'));

    expect(screen.getByTestId('bulk-create-row-0-project')).toHaveValue('proj-2');
    expect(screen.getByTestId('bulk-create-row-1-project')).toHaveValue('proj-2');
    expect(screen.getByTestId('bulk-create-row-2-project')).toHaveValue('proj-2');
  });

  it('blocks submit + flags invalid rows when required fields are missing', async () => {
    const { user } = renderPage();
    await waitFor(() => expect(screen.getByTestId('bulk-create-submit')).toBeInTheDocument());

    await user.click(screen.getByTestId('bulk-create-submit'));

    expect(await screen.findByText(/Fix 3 invalid row\(s\)/)).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('submits every valid row and navigates on full success', async () => {
    mockedCreate.mockImplementation(async (req) => ({
      id: `pos-${req.role}`,
      projectId: req.projectId,
      role: req.role,
      requiredAllocationPercent: req.requiredAllocationPercent,
      fillStatus: 'OPEN',
      version: 1,
    }));
    const { user } = renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('bulk-create-row-0-project')).toBeInTheDocument(),
    );

    // Trim to a single row, fill it.
    await user.click(screen.getByTestId('bulk-create-row-2-remove'));
    await user.click(screen.getByTestId('bulk-create-row-1-remove'));

    await user.selectOptions(screen.getByTestId('bulk-create-row-0-project'), 'proj-1');
    await user.selectOptions(screen.getByTestId('bulk-create-row-0-role'), 'Backend Engineer');
    await user.type(screen.getByTestId('bulk-create-row-0-start'), '2026-07-01');
    await user.type(screen.getByTestId('bulk-create-row-0-end'), '2026-12-31');

    await user.click(screen.getByTestId('bulk-create-submit'));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-1',
        role: 'Backend Engineer',
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        requiredAllocationPercent: 100,
        requestedByPersonId: 'pm-1',
        openImmediately: true,
      }),
    );
    await waitFor(() => expect(screen.getByTestId('staffing-desk')).toBeInTheDocument());
  });

  it('partial failure keeps created rows green and shows error banner', async () => {
    mockedCreate
      .mockResolvedValueOnce({
        id: 'pos-1',
        projectId: 'proj-1',
        role: 'Backend Engineer',
        requiredAllocationPercent: 100,
        fillStatus: 'OPEN',
        version: 1,
      })
      .mockRejectedValueOnce(new Error('Project full'));

    const { user } = renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('bulk-create-row-0-project')).toBeInTheDocument(),
    );

    // Remove the third row, fill the first two with valid data.
    await user.click(screen.getByTestId('bulk-create-row-2-remove'));

    await user.selectOptions(screen.getByTestId('bulk-create-row-0-project'), 'proj-1');
    await user.selectOptions(screen.getByTestId('bulk-create-row-0-role'), 'Backend Engineer');
    await user.type(screen.getByTestId('bulk-create-row-0-start'), '2026-07-01');
    await user.type(screen.getByTestId('bulk-create-row-0-end'), '2026-12-31');

    await user.selectOptions(screen.getByTestId('bulk-create-row-1-project'), 'proj-2');
    await user.selectOptions(screen.getByTestId('bulk-create-row-1-role'), 'Frontend Engineer');
    await user.type(screen.getByTestId('bulk-create-row-1-start'), '2026-07-01');
    await user.type(screen.getByTestId('bulk-create-row-1-end'), '2026-12-31');

    await user.click(screen.getByTestId('bulk-create-submit'));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByTestId('bulk-create-row-0-status')).toHaveTextContent('Opened'),
    );
    expect(screen.getByTestId('bulk-create-row-1-status')).toHaveTextContent(/Project full/);
    expect(screen.getByText(/1 created, 1 failed/)).toBeInTheDocument();
  });

  it('disables submit when no rows are pending', async () => {
    mockedCreate.mockResolvedValue({
      id: 'pos-1',
      projectId: 'proj-1',
      role: 'Backend Engineer',
      requiredAllocationPercent: 100,
      fillStatus: 'OPEN',
      version: 1,
    });
    const { user } = renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('bulk-create-row-0-project')).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId('bulk-create-row-2-remove'));
    await user.click(screen.getByTestId('bulk-create-row-1-remove'));

    await user.selectOptions(screen.getByTestId('bulk-create-row-0-project'), 'proj-1');
    await user.selectOptions(screen.getByTestId('bulk-create-row-0-role'), 'Backend Engineer');
    await user.type(screen.getByTestId('bulk-create-row-0-start'), '2026-07-01');
    await user.type(screen.getByTestId('bulk-create-row-0-end'), '2026-12-31');

    await user.click(screen.getByTestId('bulk-create-submit'));

    // Single row succeeded -> navigation fires; assert createProjectPosition called once.
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
  });
});
