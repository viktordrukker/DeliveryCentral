import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchWebhookDeliveries,
  fetchWebhooks,
  testWebhookDelivery,
} from '@/lib/api/webhooks';
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
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockedFetchWebhooks = vi.mocked(fetchWebhooks);
const mockedFetchWebhookDeliveries = vi.mocked(fetchWebhookDeliveries);
const mockedTestWebhookDelivery = vi.mocked(testWebhookDelivery);

const SUBSCRIPTION = {
  active: true,
  createdAt: '2026-06-01T10:00:00.000Z',
  createdByPersonId: 'admin-1',
  eventTypes: [],
  id: 'sub-1',
  secret: 'shh',
  url: 'https://example.com/hook',
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <WebhooksAdminPage />
    </MemoryRouter>,
  );
}

describe('WebhooksAdminPage — W2-14 polish', () => {
  beforeEach(() => {
    mockedFetchWebhooks.mockReset();
    mockedFetchWebhookDeliveries.mockReset();
    mockedTestWebhookDelivery.mockReset();
  });

  it('shows EmptyState with a forward action when the delivery log is empty', async () => {
    mockedFetchWebhooks.mockResolvedValue([SUBSCRIPTION]);
    mockedFetchWebhookDeliveries.mockResolvedValue([]);

    renderPage();

    await screen.findByText('https://example.com/hook');
    await userEvent.click(screen.getByRole('button', { name: 'Deliveries' }));

    await waitFor(() => {
      expect(screen.getByTestId('delivery-log')).toBeInTheDocument();
    });
    expect(screen.getByText('No deliveries yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send test delivery' })).toBeInTheDocument();
  });

  it('shows ErrorState with retry when delivery log fetch fails', async () => {
    mockedFetchWebhooks.mockResolvedValue([SUBSCRIPTION]);
    mockedFetchWebhookDeliveries.mockRejectedValueOnce(new Error('Boom'));

    renderPage();

    await screen.findByText('https://example.com/hook');
    await userEvent.click(screen.getByRole('button', { name: 'Deliveries' }));

    await waitFor(() => {
      expect(screen.getByText('Boom')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('still renders the delivery table when attempts exist', async () => {
    mockedFetchWebhooks.mockResolvedValue([SUBSCRIPTION]);
    mockedFetchWebhookDeliveries.mockResolvedValue([
      {
        attemptedAt: '2026-06-02T12:00:00.000Z',
        error: undefined,
        eventType: 'case.created',
        statusCode: 200,
        subscriptionId: 'sub-1',
        success: true,
      },
    ]);

    renderPage();

    await screen.findByText('https://example.com/hook');
    await userEvent.click(screen.getByRole('button', { name: 'Deliveries' }));

    await waitFor(() => {
      expect(screen.getByText(/OK 200/)).toBeInTheDocument();
    });
    expect(screen.queryByText('No deliveries yet')).not.toBeInTheDocument();
  });
});
