import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchBusinessAudit } from '@/lib/api/business-audit';
import { BusinessAuditPage } from './BusinessAuditPage';

vi.mock('@/lib/api/business-audit', () => ({
  fetchBusinessAudit: vi.fn(),
}));

const mockedFetchBusinessAudit = vi.mocked(fetchBusinessAudit);

const baseResponse = {
  page: 1,
  pageSize: 50,
  totalCount: 0,
  items: [],
};

describe('BusinessAuditPage', () => {
  beforeEach(() => {
    mockedFetchBusinessAudit.mockReset();
    window.localStorage.clear();
  });

  it('renders business audit records', async () => {
    mockedFetchBusinessAudit.mockResolvedValue({
      ...baseResponse,
      totalCount: 1,
      items: [
        {
          actionType: 'project.closed',
          actorId: 'director-1',
          changeSummary: 'Closed Atlas ERP Rollout after delivery completion.',
          correlationId: 'corr-1',
          metadata: { totalMandays: 4.5, workspendCaptured: true },
          occurredAt: '2026-04-03T12:30:00.000Z',
          targetEntityId: 'prj-1',
          targetEntityType: 'project',
        },
      ],
    });

    renderWithRouter();

    expect(await screen.findByText('Business Audit')).toBeInTheDocument();
    expect(screen.getByText('project.closed')).toBeInTheDocument();
    expect(screen.getByText('director-1')).toBeInTheDocument();
    expect(screen.getByText('Closed Atlas ERP Rollout after delivery completion.')).toBeInTheDocument();
    expect(screen.getByText('totalMandays: 4.5 | workspendCaptured: true')).toBeInTheDocument();
    expect(screen.getByText('Business events only. Technical logs stay in monitoring.')).toBeInTheDocument();
  });

  it('shows loading then empty state', async () => {
    mockedFetchBusinessAudit.mockReturnValueOnce(new Promise(() => undefined));

    renderWithRouter();

    expect(screen.getByText('Loading business audit...')).toBeInTheDocument();
  });

  it('shows error state when the API fails', async () => {
    mockedFetchBusinessAudit.mockRejectedValue(new Error('Business audit unavailable'));

    renderWithRouter();

    expect(await screen.findByText('Business audit unavailable')).toBeInTheDocument();
  });

  it('passes filters and pagination params to the API on submit', async () => {
    mockedFetchBusinessAudit
      .mockResolvedValueOnce({
        ...baseResponse,
        totalCount: 1,
        items: [
          {
            actionType: 'assignment.created',
            actorId: 'resource-manager-1',
            changeSummary: 'Created initial staffing record.',
            correlationId: 'corr-2',
            metadata: { allocationPercent: 50 },
            occurredAt: '2026-04-01T10:00:00.000Z',
            targetEntityId: 'asn-1',
            targetEntityType: 'assignment',
          },
        ],
      })
      .mockResolvedValueOnce({
        ...baseResponse,
        totalCount: 1,
        items: [
          {
            actionType: 'assignment.created',
            actorId: 'resource-manager-1',
            changeSummary: 'Created follow-up staffing record.',
            correlationId: 'corr-3',
            metadata: { allocationPercent: 80 },
            occurredAt: '2026-04-04T10:00:00.000Z',
            targetEntityId: 'asn-2',
            targetEntityType: 'assignment',
          },
        ],
      });

    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('assignment.created');

    await user.type(screen.getByLabelText('Entity Type'), 'assignment');
    await user.type(screen.getByLabelText('Actor'), 'resource-manager-1');
    await user.type(screen.getByLabelText('Action Type'), 'assignment.created');
    await user.clear(screen.getByLabelText('Occurred After'));
    await user.type(screen.getByLabelText('Occurred After'), '2026-04-03');
    await user.clear(screen.getByLabelText('Limit'));
    await user.type(screen.getByLabelText('Limit'), '25');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() => {
      expect(mockedFetchBusinessAudit).toHaveBeenLastCalledWith(
        expect.objectContaining({
          actionType: 'assignment.created',
          actorId: 'resource-manager-1',
          from: '2026-04-03T00:00:00.000Z',
          page: 1,
          pageSize: 25,
          targetEntityType: 'assignment',
        }),
      );
    });

    expect(await screen.findByText('Created follow-up staffing record.')).toBeInTheDocument();
  });
});

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/admin/audit']}>
      <Routes>
        <Route element={<BusinessAuditPage />} path="/admin/audit" />
      </Routes>
    </MemoryRouter>,
  );
}
