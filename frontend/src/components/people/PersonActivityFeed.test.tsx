import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { PersonActivityFeed } from './PersonActivityFeed';
import * as api from '@/lib/api/employee-activity';

/**
 * F-11.9 / 19-10 — component coverage for PersonActivityFeed.
 * Mocks the `fetchEmployeeActivity` API surface so the test exercises
 * the loading → loaded / empty / error transitions + the event-config
 * lookup (label/tone) + the inactive-flow modal (deactivated event
 * surfaces the danger-tone badge).
 */

vi.mock('@/lib/api/employee-activity', () => ({
  fetchEmployeeActivity: vi.fn(),
}));

const fetchEmployeeActivity = api.fetchEmployeeActivity as ReturnType<typeof vi.fn>;

const FIXTURE_HIRED = {
  id: 'e1',
  personId: 'p-1',
  actorId: 'admin-1',
  eventType: 'HIRED',
  summary: 'Hired as Senior Engineer',
  metadata: null,
  occurredAt: '2026-03-15T10:00:00Z',
  relatedEntityId: null,
  createdAt: '2026-03-15T10:00:00Z',
};

const FIXTURE_DEACTIVATED = {
  id: 'e2',
  personId: 'p-1',
  actorId: 'admin-1',
  eventType: 'DEACTIVATED',
  summary: 'Marked inactive (sabbatical)',
  metadata: { reason: 'sabbatical' },
  occurredAt: '2026-04-01T09:00:00Z',
  relatedEntityId: null,
  createdAt: '2026-04-01T09:00:00Z',
};

const FIXTURE_UNKNOWN_TYPE = {
  id: 'e3',
  personId: 'p-1',
  actorId: null,
  eventType: 'CUSTOM_TENANT_EVENT',
  summary: 'Tenant-defined activity',
  metadata: null,
  occurredAt: '2026-04-05T09:00:00Z',
  relatedEntityId: null,
  createdAt: '2026-04-05T09:00:00Z',
};

describe('PersonActivityFeed — F-11.9 / 19-10', () => {
  beforeEach(() => {
    fetchEmployeeActivity.mockReset();
  });

  it('renders the loading state until the fetch resolves', async () => {
    fetchEmployeeActivity.mockReturnValue(new Promise(() => {})); // never resolves
    render(<PersonActivityFeed personId="p-1" />);
    expect(screen.getByText(/Loading activity feed/i)).toBeInTheDocument();
  });

  it('renders the EmptyState when the feed is empty', async () => {
    fetchEmployeeActivity.mockResolvedValue([]);
    render(<PersonActivityFeed personId="p-1" />);
    expect(await screen.findByText(/No activity/i)).toBeInTheDocument();
    expect(screen.getByText(/No lifecycle events recorded/i)).toBeInTheDocument();
  });

  it('renders an error message when the fetch rejects', async () => {
    fetchEmployeeActivity.mockRejectedValue(new Error('backend down'));
    render(<PersonActivityFeed personId="p-1" />);
    expect(await screen.findByText(/backend down/i)).toBeInTheDocument();
  });

  it('renders one timeline row per event with the configured label + summary', async () => {
    fetchEmployeeActivity.mockResolvedValue([FIXTURE_DEACTIVATED, FIXTURE_HIRED]);
    render(<PersonActivityFeed personId="p-1" />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    expect(screen.getByText('Deactivated')).toBeInTheDocument();
    expect(screen.getByText(/Marked inactive \(sabbatical\)/)).toBeInTheDocument();
    expect(screen.getByText('Hired')).toBeInTheDocument();
    expect(screen.getByText(/Hired as Senior Engineer/)).toBeInTheDocument();
  });

  it('falls back gracefully for unknown event types (tenant custom events)', async () => {
    fetchEmployeeActivity.mockResolvedValue([FIXTURE_UNKNOWN_TYPE]);
    render(<PersonActivityFeed personId="p-1" />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    // Unknown eventType used verbatim as the label
    expect(screen.getByText('CUSTOM_TENANT_EVENT')).toBeInTheDocument();
    expect(screen.getByText(/Tenant-defined activity/)).toBeInTheDocument();
  });

  it('passes personId + limit through to fetchEmployeeActivity', async () => {
    fetchEmployeeActivity.mockResolvedValue([]);
    render(<PersonActivityFeed personId="p-9" limit={5} />);
    await waitFor(() => expect(fetchEmployeeActivity).toHaveBeenCalledWith('p-9', 5));
  });

  it('defaults the limit to 20 when not provided', async () => {
    fetchEmployeeActivity.mockResolvedValue([]);
    render(<PersonActivityFeed personId="p-9" />);
    await waitFor(() => expect(fetchEmployeeActivity).toHaveBeenCalledWith('p-9', 20));
  });
});
