/**
 * LEAN-P4-missing-4 — HR bulk org-structure reassignment.
 *
 * Validates the dsRefresh-gated bulk-reassign panel on the people directory:
 *   - panel toggle and selection wiring
 *   - destination + effective-from fields
 *   - ConfirmDialog handoff to bulkReassignOrgMembership
 */
import { readFileSync } from 'node:fs';

import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchResourcePools } from '@/lib/api/resource-pools';
import { buildPersonDirectoryItem, buildPersonDirectoryResponse } from '@test/fixtures/person-directory';
import { renderRoute } from '@test/render-route';
import { EmployeeDirectoryPage } from './EmployeeDirectoryPage';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'hr-1', roles: ['hr_manager'] },
    isAuthenticated: true,
  }),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn(),
}));

vi.mock('@/lib/api/resource-pools', () => ({
  fetchResourcePools: vi.fn(),
}));

const isFeatureEnabledMock = vi.fn();
const fetchEnrichedBenchMock = vi.fn();
const fetchSidebarCountsMock = vi.fn();
const fetchOrgChartMock = vi.fn();
const bulkReassignMock = vi.fn();

vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (flag: string) => isFeatureEnabledMock(flag),
}));
vi.mock('@/lib/api/people-bench', () => ({
  fetchEnrichedBench: (...args: unknown[]) => fetchEnrichedBenchMock(...args),
}));
vi.mock('@/lib/api/sidebar-counts', () => ({
  fetchSidebarCounts: (...args: unknown[]) => fetchSidebarCountsMock(...args),
}));
vi.mock('@/lib/api/org-chart', () => ({
  fetchOrgChart: (...args: unknown[]) => fetchOrgChartMock(...args),
}));
vi.mock('@/lib/api/organization', () => ({
  bulkReassignOrgMembership: (...args: unknown[]) => bulkReassignMock(...args),
}));

const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchResourcePools = vi.mocked(fetchResourcePools);

function renderWithRouter(): ReturnType<typeof renderRoute> {
  return renderRoute(
    <Routes>
      <Route path="/people" element={<EmployeeDirectoryPage />} />
      <Route path="/people/:id" element={<div>Employee Details</div>} />
    </Routes>,
    { initialEntries: ['/people'] },
  );
}

beforeEach(() => {
  mockedFetchPersonDirectory.mockReset();
  mockedFetchResourcePools.mockReset();
  mockedFetchResourcePools.mockResolvedValue({ items: [] });
  isFeatureEnabledMock.mockReset();
  fetchEnrichedBenchMock.mockReset();
  fetchSidebarCountsMock.mockReset();
  fetchOrgChartMock.mockReset();
  bulkReassignMock.mockReset();

  isFeatureEnabledMock.mockReturnValue(true); // dsRefresh ON
  fetchEnrichedBenchMock.mockResolvedValue([]);
  fetchSidebarCountsMock.mockResolvedValue({ projects: 0, approvals: 0, bench: 0, hrQueue: 0 });
  fetchOrgChartMock.mockResolvedValue({
    dottedLineRelationships: [],
    roots: [
      {
        id: 'unit-platform',
        code: 'PLAT',
        kind: 'department',
        name: 'Platform Engineering',
        manager: null,
        members: [],
        children: [],
      },
      {
        id: 'unit-frontend',
        code: 'FE',
        kind: 'department',
        name: 'Frontend Dept',
        manager: null,
        members: [],
        children: [],
      },
    ],
  });
});

describe('EmployeeDirectoryPage — bulk reassign org unit', () => {
  it('shows the toggle button for HR + opens the panel', async () => {
    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({
        items: [buildPersonDirectoryItem({ id: 'p1', displayName: 'Ada' })],
        total: 1,
      }),
    );
    const { user } = renderWithRouter();

    const toggle = await screen.findByTestId('people-bulk-reassign-toggle');
    expect(toggle.textContent).toMatch(/Bulk reassign/);
    await user.click(toggle);

    expect(await screen.findByTestId('people-bulk-reassign-panel')).toBeInTheDocument();
    expect(screen.getByTestId('people-bulk-target-unit')).toBeInTheDocument();
    expect(screen.getByTestId('people-bulk-effective-from')).toBeInTheDocument();
  });

  it('selecting people + confirming calls bulkReassignOrgMembership', async () => {
    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({
        items: [
          buildPersonDirectoryItem({ id: 'p1', displayName: 'Ada' }),
          buildPersonDirectoryItem({ id: 'p2', displayName: 'Grace' }),
        ],
        total: 2,
      }),
    );
    bulkReassignMock.mockResolvedValue({
      movedPersonIds: ['p1', 'p2'],
      skippedPersonIds: [],
      newMembershipIds: ['m1', 'm2'],
    });

    const { user } = renderWithRouter();
    await user.click(await screen.findByTestId('people-bulk-reassign-toggle'));

    // Org units load asynchronously.
    await waitFor(() =>
      expect(screen.getByTestId('people-bulk-target-unit').querySelectorAll('option').length).toBeGreaterThan(1),
    );

    // Select destination + check two people.
    await user.selectOptions(screen.getByTestId('people-bulk-target-unit'), 'unit-platform');
    await user.click(screen.getByTestId('people-bulk-select-p1'));
    await user.click(screen.getByTestId('people-bulk-select-p2'));

    // Submit → ConfirmDialog opens.
    await user.click(screen.getByTestId('people-bulk-reassign-submit'));
    const confirm = await screen.findByRole('button', { name: 'Reassign' });

    // Type a reason then confirm.
    const reasonField = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(reasonField).toBeTruthy();
    await user.type(reasonField, 'Org realignment Q3');
    await user.click(confirm);

    await waitFor(() => expect(bulkReassignMock).toHaveBeenCalledTimes(1));
    expect(bulkReassignMock.mock.calls[0][0]).toMatchObject({
      personIds: ['p1', 'p2'],
      toOrgUnitId: 'unit-platform',
      reason: 'Org realignment Q3',
    });

    // Result banner renders.
    expect(await screen.findByTestId('people-bulk-reassign-result')).toHaveTextContent(/Moved 2/);
  });

  it('hides the toggle when dsRefresh is OFF', async () => {
    isFeatureEnabledMock.mockReturnValue(false);
    mockedFetchPersonDirectory.mockResolvedValue(
      buildPersonDirectoryResponse({
        items: [buildPersonDirectoryItem({ id: 'p1', displayName: 'Ada' })],
        total: 1,
      }),
    );
    renderWithRouter();
    await screen.findByText('Ada');
    expect(screen.queryByTestId('people-bulk-reassign-toggle')).not.toBeInTheDocument();
  });
});

describe('LEAN-P4-missing-4 — source-shape guarantees', () => {
  const apiSrc = readFileSync('src/lib/api/organization.ts', 'utf-8');
  const beServiceSrc = readFileSync(
    '../src/modules/organization/application/bulk-reassign-org-membership.service.ts',
    'utf-8',
  );
  const beControllerSrc = readFileSync(
    '../src/modules/organization/presentation/organization.controller.ts',
    'utf-8',
  );

  it('FE API posts to /org/bulk-reassign-membership', () => {
    expect(apiSrc).toMatch(/POST.*\/org\/bulk-reassign-membership|\/org\/bulk-reassign-membership/);
    expect(apiSrc).toMatch(/httpPost</);
  });

  it('BE service uses prisma.\\$transaction', () => {
    expect(beServiceSrc).toMatch(/prisma\.\$transaction/);
  });

  it('BE service writes createdByPersonId + updatedByPersonId (D-103 actor-audit)', () => {
    expect(beServiceSrc).toMatch(/createdByPersonId:\s*command\.actorId/);
    expect(beServiceSrc).toMatch(/updatedByPersonId:\s*command\.actorId/);
  });

  it('BE controller guards POST with HR_GOVERNANCE_ROLES', () => {
    expect(beControllerSrc).toMatch(/@RequireRoles\(\.\.\.HR_GOVERNANCE_ROLES\)/);
  });
});
