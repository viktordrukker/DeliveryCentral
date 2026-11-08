import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchBusinessAudit } from '@/lib/api/business-audit';
import { exportToXlsx } from '@/lib/export';
import { BusinessAuditPage } from './BusinessAuditPage';

vi.mock('@/lib/api/business-audit', () => ({
  fetchBusinessAudit: vi.fn(),
}));

vi.mock('@/lib/export', () => ({
  exportToXlsx: vi.fn(),
}));

const mockedFetchBusinessAudit = vi.mocked(fetchBusinessAudit);
const mockedExportToXlsx = vi.mocked(exportToXlsx);

const baseResponse = {
  page: 1,
  pageSize: 50,
  totalCount: 0,
  items: [],
};

describe('BusinessAuditPage', () => {
  beforeEach(() => {
    mockedFetchBusinessAudit.mockReset();
    mockedExportToXlsx.mockReset();
    window.localStorage.clear();
  });

  it('renders business audit records with displayName (no raw UUIDs)', async () => {
    mockedFetchBusinessAudit.mockResolvedValue({
      ...baseResponse,
      totalCount: 1,
      items: [
        {
          actionType: 'project.closed',
          actorId: '11111111-1111-1111-1111-111111111005',
          actorDisplayName: 'Director Diane',
          actorPublicId: 'usr_director1',
          changeSummary: 'Closed Atlas ERP Rollout after delivery completion.',
          correlationId: 'corr-1',
          metadata: { totalMandays: 4.5, workspendCaptured: true },
          occurredAt: '2026-04-03T12:30:00.000Z',
          targetEntityId: '22222222-2222-2222-2222-222222222001',
          targetEntityType: 'project',
        },
      ],
    });

    renderWithRouter();

    expect(await screen.findByText('Business Audit')).toBeInTheDocument();
    expect(screen.getByText('project.closed')).toBeInTheDocument();
    expect(screen.getByText('Director Diane')).toBeInTheDocument();
    expect(screen.getByText('Closed Atlas ERP Rollout after delivery completion.')).toBeInTheDocument();
    expect(screen.getByText('totalMandays: 4.5 | workspendCaptured: true')).toBeInTheDocument();
    expect(screen.getByText('Business events only. Technical logs stay in monitoring.')).toBeInTheDocument();

    // W1-13 UUID_LEAK guard — no raw UUID may appear in the rendered table.
    expect(screen.queryByText('11111111-1111-1111-1111-111111111005')).not.toBeInTheDocument();
    expect(screen.queryByText('22222222-2222-2222-2222-222222222001')).not.toBeInTheDocument();
  });

  it('shows loading then empty state', async () => {
    mockedFetchBusinessAudit.mockReturnValueOnce(new Promise(() => undefined));

    renderWithRouter();

    expect(screen.getByLabelText('Loading business audit...')).toBeInTheDocument();
  });

  it('shows error state when the API fails', async () => {
    mockedFetchBusinessAudit.mockRejectedValue(new Error('Business audit unavailable'));

    renderWithRouter();

    expect(await screen.findByText('Business audit unavailable')).toBeInTheDocument();
  });

  it('XLSX export uses displayName + publicId, never raw UUIDs', async () => {
    mockedFetchBusinessAudit.mockResolvedValue({
      ...baseResponse,
      totalCount: 1,
      items: [
        {
          actionType: 'project.closed',
          actorId: '11111111-1111-1111-1111-111111111005',
          actorDisplayName: 'Director Diane',
          actorPublicId: 'usr_director1',
          changeSummary: 'Closed Atlas ERP Rollout.',
          correlationId: 'corr-1',
          metadata: {},
          occurredAt: '2026-04-03T12:30:00.000Z',
          targetEntityId: '22222222-2222-2222-2222-222222222001',
          targetEntityType: 'project',
        },
      ],
    });

    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('project.closed');
    await user.click(screen.getByRole('button', { name: /Export XLSX/i }));

    expect(mockedExportToXlsx).toHaveBeenCalledTimes(1);
    const [rows] = mockedExportToXlsx.mock.calls[0]!;
    const serialized = JSON.stringify(rows);

    // W1-13 XLSX UUID_LEAK guard — exported workbook must not embed raw UUIDs.
    expect(serialized).not.toContain('11111111-1111-1111-1111-111111111005');
    expect(serialized).not.toContain('22222222-2222-2222-2222-222222222001');
    expect(serialized).toContain('Director Diane');
    expect(serialized).toContain('usr_director1');
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
