import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { buildProjectDirectoryResponse } from '@test/fixtures/project-registry';

import { CreatePositionDrawer } from './CreatePositionDrawer';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'person-pm-1', roles: ['project_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockFetchProjectDirectory = vi.fn();
const mockCreateProjectPosition = vi.fn();
const mockTransitionProjectPositionFill = vi.fn();

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: (params: unknown) => mockFetchProjectDirectory(params),
}));
vi.mock('@/lib/api/project-positions', () => ({
  createProjectPosition: (req: unknown) => mockCreateProjectPosition(req),
  transitionProjectPositionFill: (id: string, req: unknown) =>
    mockTransitionProjectPositionFill(id, req),
}));

describe('CreatePositionDrawer — SoT PR 8 embedded create flow', () => {
  beforeEach(() => {
    mockFetchProjectDirectory.mockResolvedValue(buildProjectDirectoryResponse());
    mockCreateProjectPosition.mockReset();
    mockTransitionProjectPositionFill.mockReset();
  });

  it('does not render the form when open=false', () => {
    const { container } = renderRoute(
      <CreatePositionDrawer open={false} onClose={() => {}} />,
    );
    expect(container.querySelector('[data-testid="create-position-drawer"]')).toBeNull();
  });

  it('renders the DS drawer with form fields when open=true', async () => {
    const { container } = renderRoute(
      <CreatePositionDrawer open onClose={() => {}} initialProjectId="prj-123" />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="create-position-drawer"]')).not.toBeNull();
    });

    await waitFor(() => {
      const fieldLabels = Array.from(
        document.querySelectorAll('.ds-form-field__label'),
      ).map((el) => el.textContent ?? '');
      expect(fieldLabels.some((t) => t.includes('Project'))).toBe(true);
      expect(fieldLabels.some((t) => t.includes('Role'))).toBe(true);
      expect(fieldLabels.some((t) => t.includes('Start date'))).toBe(true);
      expect(fieldLabels.some((t) => t.includes('Allocation'))).toBe(true);
    });

    // Suppress unused-var warning when container isn't directly used in assertions.
    expect(container).toBeTruthy();
  });

  it('surfaces validation errors when submitting an empty form', async () => {
    const { user } = renderRoute(
      <CreatePositionDrawer open onClose={() => {}} />,
    );

    await waitFor(() => {
      expect(document.querySelector('.ds-select')).not.toBeNull();
    });

    const submit = document.querySelector(
      '#create-position-drawer-form ~ * button[type="submit"], button[type="submit"][form="create-position-drawer-form"]',
    ) as HTMLButtonElement | null;
    // The submit button lives in the Drawer footer, attached via form="..."
    expect(submit).not.toBeNull();
    await user.click(submit!);

    await waitFor(() => {
      const errorNodes = document.querySelectorAll('.ds-form-field__error');
      expect(errorNodes.length).toBeGreaterThanOrEqual(3);
    });

    expect(mockCreateProjectPosition).not.toHaveBeenCalled();
  });
});
