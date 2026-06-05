import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ImpersonationProvider } from '@/app/impersonation-context';
import {
  fetchAdminAccounts,
  fetchAdminConfig,
  fetchAdminIntegrations,
  fetchAdminNotifications,
  fetchAdminSettings,
} from '@/lib/api/admin';
import { AdminPanelPage } from './AdminPanelPage';

/**
 * SCOPED-MIN-4 — Admin inline sections, canonical primitives.
 *
 * Migrates the 4 most-noticeable inconsistencies on AdminPanelPage to canonical
 * Admin Control Surface primitives:
 *   1. Account status renders via StatusBadge (variant="text"), not inline span.
 *   2. Create-account form inputs render via DS FormField + Input, not raw <input>.
 *   3. The Roles hint renders as the FormField hint, not an inline-styled span.
 *   4. The form layout uses .entity-form, not inline flex styles.
 */

vi.mock('@/lib/api/admin', () => ({
  fetchAdminConfig: vi.fn(),
  fetchAdminIntegrations: vi.fn(),
  fetchAdminNotifications: vi.fn(),
  fetchAdminSettings: vi.fn(),
  fetchAdminAccounts: vi.fn(),
}));

const mockedFetchAdminConfig = vi.mocked(fetchAdminConfig);
const mockedFetchAdminSettings = vi.mocked(fetchAdminSettings);
const mockedFetchAdminIntegrations = vi.mocked(fetchAdminIntegrations);
const mockedFetchAdminNotifications = vi.mocked(fetchAdminNotifications);
const mockedFetchAdminAccounts = vi.mocked(fetchAdminAccounts);

function mockEmpty(): void {
  mockedFetchAdminConfig.mockResolvedValue({
    dictionaries: [
      {
        dictionaryKey: 'project-types',
        displayName: 'Project Types',
        enabledEntryCount: 2,
        entityType: 'Project',
        entryCount: 3,
        id: 'dict-1',
        isSystemManaged: false,
      },
    ],
    integrations: [],
    systemFlags: [],
  } as never);
  mockedFetchAdminSettings.mockResolvedValue({ systemFlags: [] } as never);
  mockedFetchAdminIntegrations.mockResolvedValue({ integrations: [] } as never);
  mockedFetchAdminNotifications.mockResolvedValue({ channels: [], templates: [] } as never);
}

function renderPanel(): void {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <ImpersonationProvider>
        <AdminPanelPage />
      </ImpersonationProvider>
    </MemoryRouter>,
  );
}

describe('AdminPanelPage — SCOPED-MIN-4 canonical primitives', () => {
  it('renders the account "Status" column via StatusBadge (variant=text), not inline span', async () => {
    mockEmpty();
    mockedFetchAdminAccounts.mockResolvedValue({
      items: [
        {
          id: 'acc-1',
          email: 'enabled@example.com',
          displayName: 'Enabled User',
          isEnabled: true,
          personId: 'p-1',
          roles: ['delivery_manager'],
          source: 'local',
        },
        {
          id: 'acc-2',
          email: 'disabled@example.com',
          displayName: 'Disabled User',
          isEnabled: false,
          personId: null,
          roles: ['employee'],
          source: 'local',
        },
      ],
      totalCount: 2,
    } as never);

    renderPanel();

    // Both rows should resolve their status via StatusBadge — which exposes
    // a stable `.status-badge` className.
    const enabled = await screen.findByText('Enabled');
    const disabled = await screen.findByText('Disabled');
    expect(enabled.closest('.status-badge')).not.toBeNull();
    expect(disabled.closest('.status-badge')).not.toBeNull();
  });

  it('renders the create-account form via DS FormField + Input, with the entity-form class', async () => {
    mockEmpty();
    mockedFetchAdminAccounts.mockResolvedValue({ items: [], totalCount: 0 } as never);

    renderPanel();

    await waitFor(() =>
      expect(screen.getByText('Create Local Account')).toBeInTheDocument(),
    );

    // The four account-form fields wear the ds-form-field shell instead of raw labels.
    expect(document.querySelectorAll('.ds-form-field').length).toBeGreaterThanOrEqual(4);

    // Each input is the DS Input atom, not the legacy `.input` class.
    const personIdInput = screen.getByPlaceholderText('UUID of the person record');
    expect(personIdInput).toHaveClass('ds-input');
    expect(personIdInput).not.toHaveClass('input');

    const emailInput = screen.getByPlaceholderText('login@example.com');
    expect(emailInput).toHaveClass('ds-input');
    expect(emailInput).toHaveAttribute('type', 'email');

    const passwordInput = screen.getByPlaceholderText('Minimum 8 characters');
    expect(passwordInput).toHaveClass('ds-input');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Roles hint is rendered through FormField, not an ad-hoc inline span.
    const hint = screen.getByText(/Available: admin, delivery_manager/);
    expect(hint).toHaveClass('ds-form-field__hint');

    // Form chrome uses the shared entity-form layout, not inline flex styles.
    const form = personIdInput.closest('form');
    expect(form).not.toBeNull();
    expect(form).toHaveClass('entity-form');
  });
});
