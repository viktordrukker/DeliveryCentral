import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { fetchOrgConfig } from '@/lib/api/org-config';

import { OrganizationConfigPage } from './OrganizationConfigPage';

vi.mock('@/lib/api/org-config', () => ({
  fetchOrgConfig: vi.fn(),
  updateOrgConfig: vi.fn(),
  resetOrgConfig: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedFetch = vi.mocked(fetchOrgConfig);

const MOCK_CONFIG = {
  id: 'org-1',
  reportingCadence: 'WEEKLY' as const,
  tierLabels: { A: 'Tier A', B: 'Tier B' },
  exceptionAxisThreshold: 1,
  riskCadenceMap: { WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 30, QUARTERLY: 90 },
  crStaleThresholdDays: 14,
  milestoneSlippedGraceDays: 7,
  timesheetGapDays: 7,
  pmReassignmentPolicy: 'pm-or-director-or-admin' as const,
  defaultShapeForNewProject: 'STANDARD' as const,
  defaultHourlyRate: 100,
  ragThresholdCritical: 1,
  ragThresholdRed: 2,
  ragThresholdAmber: 3,
  colourBlindMode: false,
  updatedAt: '2026-06-06T00:00:00Z',
  updatedByPersonId: null,
};

describe('OrganizationConfigPage — W3-01 grammar conformance', () => {
  it('renders inside the admin tabbed shell with PageContainer + PageHeader + tab strip', async () => {
    mockedFetch.mockResolvedValue(MOCK_CONFIG);
    render(
      <MemoryRouter initialEntries={['/admin/organization-config']}>
        <OrganizationConfigPage />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('organization-config-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Organization configuration' })).toBeInTheDocument();
    expect(screen.getByTestId('tab-settings')).toBeInTheDocument();
    expect(screen.getByTestId('tab-organization-config')).toBeInTheDocument();
    expect(screen.getByTestId('tab-hris')).toBeInTheDocument();
    expect(screen.getByTestId('tab-webhooks')).toBeInTheDocument();
    expect(screen.getByTestId('tab-organization-config')).toHaveAttribute('aria-selected', 'true');
  });
});
