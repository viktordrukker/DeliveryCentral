import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { fetchWebhooks } from '@/lib/api/webhooks';

import { WebhooksAdminPage } from './WebhooksAdminPage';

vi.mock('@/lib/api/webhooks', () => ({
  fetchWebhooks: vi.fn(),
  createWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  testWebhookDelivery: vi.fn(),
  fetchWebhookDeliveries: vi.fn(),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'admin-1', roles: ['admin'] },
    isLoading: false,
  }),
}));

const mockedFetch = vi.mocked(fetchWebhooks);

describe('WebhooksAdminPage — W3-01 grammar conformance', () => {
  it('renders inside the admin tabbed shell with PageContainer + PageHeader + tab strip', async () => {
    mockedFetch.mockResolvedValue([]);
    render(
      <MemoryRouter initialEntries={['/admin/webhooks']}>
        <WebhooksAdminPage />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('webhooks-admin-page')).toBeInTheDocument();
    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: 'Webhook Subscriptions' })).toBeInTheDocument();
    expect(screen.getByTestId('tab-settings')).toBeInTheDocument();
    expect(screen.getByTestId('tab-organization-config')).toBeInTheDocument();
    expect(screen.getByTestId('tab-hris')).toBeInTheDocument();
    expect(screen.getByTestId('tab-webhooks')).toBeInTheDocument();
    expect(screen.getByTestId('tab-webhooks')).toHaveAttribute('aria-selected', 'true');
  });
});
