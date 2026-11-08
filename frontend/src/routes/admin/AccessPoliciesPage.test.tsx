import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { httpGet } from '@/lib/api/http-client';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { AccessPoliciesPage } from './AccessPoliciesPage';

vi.mock('@/lib/api/http-client', () => ({
  httpGet: vi.fn(),
}));

vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: vi.fn(),
}));

const mockedHttpGet = vi.mocked(httpGet);
const mockedFlag = vi.mocked(isFeatureEnabled);

const POLICIES = [
  {
    id: 'project-pm-read',
    roles: ['project_manager'],
    resource: 'project',
    action: 'read',
    description: 'PMs read projects they manage.',
  },
];

function renderPage(): void {
  render(
    <MemoryRouter>
      <AccessPoliciesPage />
    </MemoryRouter>,
  );
}

describe('AccessPoliciesPage — W4-09 edit affordance', () => {
  beforeEach(() => {
    mockedHttpGet.mockReset();
    mockedFlag.mockReset();
    mockedHttpGet.mockResolvedValue(POLICIES);
  });

  it('shows the runbook CTA + note when adminRolePermissionUI flag is OFF', async () => {
    mockedFlag.mockImplementation((id) => (id === 'adminRolePermissionUI' ? false : false));

    renderPage();

    const runbookCta = await screen.findByTestId('edit-via-runbook-cta');
    expect(runbookCta).toHaveAttribute(
      'href',
      'https://github.com/viktordrukker/DeliveryCentral/blob/main/docs/runbooks/ACCESS_POLICIES_EDIT_SOP.md',
    );
    expect(runbookCta).toHaveAttribute('target', '_blank');
    expect(runbookCta).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(runbookCta.textContent).toMatch(/Edit access policies via the admin runbook/i);

    await waitFor(() => expect(screen.getByTestId('edit-via-runbook-note')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /Edit role presets/i })).not.toBeInTheDocument();
  });

  it('shows the GA "Edit role presets" button when adminRolePermissionUI is ON and hides the runbook note', async () => {
    mockedFlag.mockImplementation((id) => (id === 'adminRolePermissionUI' ? true : false));

    renderPage();

    expect(await screen.findByRole('link', { name: /Edit role presets/i })).toBeInTheDocument();
    expect(screen.queryByTestId('edit-via-runbook-cta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('edit-via-runbook-note')).not.toBeInTheDocument();
  });
});
