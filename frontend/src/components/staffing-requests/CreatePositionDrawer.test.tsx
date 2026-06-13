import { fireEvent, waitFor } from '@testing-library/react';
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
const mockFetchSkills = vi.fn();
const mockFetchPersonDirectoryById = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastWarning = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: (params: unknown) => mockFetchProjectDirectory(params),
}));
vi.mock('@/lib/api/project-positions', () => ({
  createProjectPosition: (req: unknown) => mockCreateProjectPosition(req),
  transitionProjectPositionFill: (id: string, req: unknown) =>
    mockTransitionProjectPositionFill(id, req),
}));
vi.mock('@/lib/api/skills', () => ({
  fetchSkills: () => mockFetchSkills(),
}));
vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectoryById: (id: string) => mockFetchPersonDirectoryById(id),
}));
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    warning: (...args: unknown[]) => mockToastWarning(...args),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CreatePositionDrawer — SoT PR 8 embedded create flow', () => {
  beforeEach(() => {
    mockFetchProjectDirectory.mockResolvedValue(buildProjectDirectoryResponse());
    mockCreateProjectPosition.mockReset();
    mockTransitionProjectPositionFill.mockReset();
    mockFetchPersonDirectoryById.mockReset();
    mockToastSuccess.mockReset();
    mockToastWarning.mockReset();
    mockNavigate.mockReset();
    mockFetchSkills.mockResolvedValue([
      { id: 'skill-react', name: 'React', category: 'Frontend', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'skill-node', name: 'Node.js', category: 'Backend', createdAt: '2026-01-01T00:00:00Z' },
    ]);
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

  it('sends skills + priority in the create payload (PR-7 field fidelity)', async () => {
    mockCreateProjectPosition.mockResolvedValue({
      id: 'pos-1',
      role: 'Senior Backend Engineer',
      fillStatus: 'OPEN',
    });
    const { user } = renderRoute(<CreatePositionDrawer open onClose={() => {}} />);

    await waitFor(() => {
      expect(document.querySelectorAll('select').length).toBeGreaterThanOrEqual(3);
    });

    // Selects render in form order: Project, Role, Priority.
    const [projectSelect, roleSelect, prioritySelect] = Array.from(
      document.querySelectorAll('select'),
    );
    await user.selectOptions(projectSelect, 'project-atlas-erp-rollout');
    await user.selectOptions(roleSelect, 'Senior Backend Engineer');
    await user.selectOptions(prioritySelect, 'URGENT');

    // Pick a skill from the catalog-backed multi-combobox.
    const skillInput = await waitFor(() => {
      const input = document.querySelector<HTMLInputElement>('.ds-multi-combobox__input');
      expect(input).not.toBeNull();
      expect(input!.disabled).toBe(false);
      return input!;
    });
    await user.click(skillInput);
    await user.keyboard('Rea');
    const reactOption = await waitFor(() => {
      const option = Array.from(document.querySelectorAll('[role="option"]')).find((el) =>
        (el.textContent ?? '').includes('React'),
      );
      expect(option).toBeTruthy();
      return option!;
    });
    await user.click(reactOption);

    const [startInput, endInput] = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="date"]'),
    );
    fireEvent.change(startInput, { target: { value: '2026-07-01' } });
    fireEvent.change(endInput, { target: { value: '2026-12-31' } });

    const submit = document.querySelector(
      'button[type="submit"][form="create-position-drawer-form"]',
    ) as HTMLButtonElement;
    await user.click(submit);

    await waitFor(() => {
      expect(mockCreateProjectPosition).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateProjectPosition).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-atlas-erp-rollout',
        role: 'Senior Backend Engineer',
        priority: 'URGENT',
        skills: ['React'],
        startDate: '2026-07-01',
        endDate: '2026-12-31',
      }),
    );
  });
});

describe('CreatePositionDrawer — PR-11 bench candidate threading', () => {
  beforeEach(() => {
    mockFetchProjectDirectory.mockResolvedValue(buildProjectDirectoryResponse());
    mockCreateProjectPosition.mockReset();
    mockTransitionProjectPositionFill.mockReset();
    mockFetchPersonDirectoryById.mockReset();
    mockToastSuccess.mockReset();
    mockToastWarning.mockReset();
    mockNavigate.mockReset();
    mockFetchSkills.mockResolvedValue([]);
  });

  async function fillAndSubmit(user: ReturnType<typeof renderRoute>['user']): Promise<void> {
    await waitFor(() => {
      expect(document.querySelectorAll('select').length).toBeGreaterThanOrEqual(3);
    });
    const [projectSelect, roleSelect] = Array.from(document.querySelectorAll('select'));
    await user.selectOptions(projectSelect, 'project-atlas-erp-rollout');
    await user.selectOptions(roleSelect, 'Senior Backend Engineer');
    const [startInput, endInput] = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="date"]'),
    );
    fireEvent.change(startInput, { target: { value: '2026-07-01' } });
    fireEvent.change(endInput, { target: { value: '2026-12-31' } });
    const submit = document.querySelector(
      'button[type="submit"][form="create-position-drawer-form"]',
    ) as HTMLButtonElement;
    await user.click(submit);
  }

  it('pins the candidate in the drawer header when candidate props are present', async () => {
    renderRoute(
      <CreatePositionDrawer
        open
        onClose={() => {}}
        candidatePersonId="person-bench-1"
        candidateDisplayName="Grace Hopper"
      />,
    );

    await waitFor(() => {
      const pin = document.querySelector('[data-testid="create-position-candidate-pin"]');
      expect(pin).not.toBeNull();
      expect(pin!.textContent).toContain('Creating position for');
      expect(pin!.textContent).toContain('Grace Hopper');
    });
    expect(mockFetchPersonDirectoryById).not.toHaveBeenCalled();
  });

  it('resolves the candidate name from the directory when only the id is armed', async () => {
    mockFetchPersonDirectoryById.mockResolvedValue({ id: 'person-bench-1', displayName: 'Ada Lovelace' });
    renderRoute(
      <CreatePositionDrawer open onClose={() => {}} candidatePersonId="person-bench-1" />,
    );

    await waitFor(() => {
      const pin = document.querySelector('[data-testid="create-position-candidate-pin"]');
      expect(pin).not.toBeNull();
      expect(pin!.textContent).toContain('Ada Lovelace');
    });
    expect(mockFetchPersonDirectoryById).toHaveBeenCalledWith('person-bench-1');
  });

  it('auto-proposes the armed candidate after a successful create', async () => {
    mockCreateProjectPosition.mockResolvedValue({
      id: 'pos-9',
      publicId: 'pos_pub9',
      projectId: 'project-atlas-erp-rollout',
      role: 'Senior Backend Engineer',
      fillStatus: 'OPEN',
    });
    mockTransitionProjectPositionFill.mockResolvedValue({});
    const onCreated = vi.fn();
    const { user } = renderRoute(
      <CreatePositionDrawer
        open
        onClose={() => {}}
        onCreated={onCreated}
        candidatePersonId="person-bench-1"
        candidateDisplayName="Grace Hopper"
      />,
    );

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(mockTransitionProjectPositionFill).toHaveBeenCalledWith('pos-9', {
        toStatus: 'PROPOSED',
        personId: 'person-bench-1',
      });
    });
    expect(mockTransitionProjectPositionFill).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Grace Hopper proposed'),
    );
    expect(onCreated).toHaveBeenCalledWith('pos-9');
  });

  it('keeps the created position and surfaces a warning toast when the propose fails', async () => {
    mockCreateProjectPosition.mockResolvedValue({
      id: 'pos-9',
      publicId: 'pos_pub9',
      projectId: 'project-atlas-erp-rollout',
      role: 'Senior Backend Engineer',
      fillStatus: 'OPEN',
    });
    mockTransitionProjectPositionFill.mockRejectedValue(new Error('person is terminated'));
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const { user } = renderRoute(
      <CreatePositionDrawer
        open
        onClose={onClose}
        onCreated={onCreated}
        candidatePersonId="person-bench-1"
        candidateDisplayName="Grace Hopper"
      />,
    );

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(mockToastWarning).toHaveBeenCalledTimes(1);
    });
    const [message, options] = mockToastWarning.mock.calls[0] as [
      string,
      { action: { label: string; onClick: () => void } },
    ];
    expect(message).toContain('Position created');
    expect(message).toContain('Grace Hopper');
    expect(message).toContain('person is terminated');
    expect(options.action.label).toBe('View position');
    // PR-20 — the "View position" deep-link arms the detail page's propose
    // dialog with the candidate so the retry is one click.
    options.action.onClick();
    expect(mockNavigate).toHaveBeenCalledWith(
      '/projects/project-atlas-erp-rollout/positions/pos_pub9?proposePersonId=person-bench-1',
    );
    // No silent orphan: the drawer still closes and reports the created id.
    expect(onCreated).toHaveBeenCalledWith('pos-9');
    expect(onClose).toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});
