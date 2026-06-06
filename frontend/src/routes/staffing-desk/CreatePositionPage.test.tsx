import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { renderRoute } from '@test/render-route';
import { buildProjectDirectoryResponse } from '@test/fixtures/project-registry';
import { CreatePositionPage } from './CreatePositionPage';

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

describe('CreatePositionPage — W3-04 DS form primitives', () => {
  beforeEach(() => {
    mockFetchProjectDirectory.mockResolvedValue(buildProjectDirectoryResponse());
    mockCreateProjectPosition.mockReset();
    mockTransitionProjectPositionFill.mockReset();
  });

  it('renders DS FormField labels wrapping the Project / Role / Priority controls', async () => {
    const { container } = renderRoute(<CreatePositionPage />);

    // Wait for projects to load (so Select replaces LoadingState).
    await waitFor(() => {
      expect(container.querySelectorAll('.ds-form-field').length).toBeGreaterThanOrEqual(6);
    });

    // FormField shells for required labels are present.
    const fieldLabels = Array.from(container.querySelectorAll('.ds-form-field__label')).map(
      (el) => el.textContent ?? '',
    );
    expect(fieldLabels.some((t) => t.includes('Project'))).toBe(true);
    expect(fieldLabels.some((t) => t.includes('Role'))).toBe(true);
    expect(fieldLabels.some((t) => t.includes('Priority'))).toBe(true);
    expect(fieldLabels.some((t) => t.includes('Start date'))).toBe(true);
    expect(fieldLabels.some((t) => t.includes('End date'))).toBe(true);
    expect(fieldLabels.some((t) => t.includes('Allocation'))).toBe(true);
    expect(fieldLabels.some((t) => t.includes('Summary'))).toBe(true);
  });

  it('uses DS Select / Input / DatePicker / Textarea / Checkbox in the DOM (no raw field__control)', async () => {
    const { container } = renderRoute(<CreatePositionPage />);
    await waitFor(() => {
      expect(container.querySelector('.ds-select')).not.toBeNull();
    });
    // DS atom CSS hooks must be present.
    expect(container.querySelectorAll('.ds-select').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('input[type="date"].ds-input').length).toBe(2);
    expect(container.querySelectorAll('input[type="number"].ds-input').length).toBe(1);
    expect(container.querySelector('.ds-textarea')).not.toBeNull();
    expect(container.querySelector('.ds-checkbox')).not.toBeNull();
    expect(container.querySelector('.ds-checkbox__input')).not.toBeNull();

    // Legacy `field__control` className must NOT appear anymore.
    expect(container.querySelector('.field__control')).toBeNull();
  });

  it('surfaces FormField validation errors when submitting an empty form', async () => {
    const { container, user } = renderRoute(<CreatePositionPage />);
    await waitFor(() => {
      expect(container.querySelector('.ds-select')).not.toBeNull();
    });

    const submit = container.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    expect(submit).not.toBeNull();
    await user.click(submit!);

    await waitFor(() => {
      const errorNodes = container.querySelectorAll('.ds-form-field__error');
      expect(errorNodes.length).toBeGreaterThanOrEqual(3);
    });

    const errorTexts = Array.from(container.querySelectorAll('.ds-form-field__error')).map(
      (el) => el.textContent ?? '',
    );
    expect(errorTexts.some((t) => t.includes('Project is required'))).toBe(true);
    expect(errorTexts.some((t) => t.includes('Role is required'))).toBe(true);
    expect(errorTexts.some((t) => t.includes('Start date is required'))).toBe(true);

    expect(mockCreateProjectPosition).not.toHaveBeenCalled();
  });
});
