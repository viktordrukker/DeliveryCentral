import { act, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { fetchInbox, markNotificationRead, markAllRead } from '@/lib/api/inbox';
import { renderRoute } from '@test/render-route';
import { NotificationBell } from './NotificationBell';

vi.mock('@/lib/api/inbox', () => ({
  fetchInbox: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllRead: vi.fn(),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'user-1', roles: ['employee'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockedFetchInbox = vi.mocked(fetchInbox);
const mockedMarkRead = vi.mocked(markNotificationRead);
const mockedMarkAllRead = vi.mocked(markAllRead);

const buildNotification = (overrides: Partial<{
  id: string;
  recipientPersonId: string;
  eventType: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}> = {}) => ({
  id: 'notif-1',
  recipientPersonId: 'user-1',
  eventType: 'assignment.approved',
  title: 'Assignment approved',
  body: null,
  link: '/assignments/asgn-1',
  readAt: null,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

describe('NotificationBell', () => {
  beforeEach(() => {
    mockedFetchInbox.mockResolvedValue([]);
    mockedMarkRead.mockResolvedValue(undefined);
    mockedMarkAllRead.mockResolvedValue(undefined);
  });

  it('renders the bell button', async () => {
    renderRoute(<NotificationBell />);
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('shows unread count badge when there are unread notifications', async () => {
    mockedFetchInbox.mockResolvedValue([
      buildNotification({ id: 'n-1', readAt: null }),
      buildNotification({ id: 'n-2', readAt: null }),
      buildNotification({ id: 'n-3', readAt: new Date().toISOString() }),
    ]);

    renderRoute(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('opens dropdown on bell click', async () => {
    mockedFetchInbox.mockResolvedValue([
      buildNotification({ id: 'n-1', title: 'Assignment approved' }),
    ]);

    const { user } = renderRoute(<NotificationBell />);

    await waitFor(() => expect(mockedFetchInbox).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(await screen.findByText('Assignment approved')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    mockedFetchInbox.mockResolvedValue([]);

    const { user } = renderRoute(<NotificationBell />);

    await waitFor(() => expect(mockedFetchInbox).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('calls markNotificationRead when × button is clicked', async () => {
    mockedFetchInbox.mockResolvedValue([
      buildNotification({ id: 'n-1', readAt: null }),
    ]);

    const { user } = renderRoute(<NotificationBell />);

    await waitFor(() => expect(mockedFetchInbox).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const markReadBtn = await screen.findByRole('button', { name: /mark as read/i });
    await user.click(markReadBtn);

    expect(mockedMarkRead).toHaveBeenCalledWith('n-1');
  });

  it('calls markAllRead when "Mark all read" button is clicked', async () => {
    mockedFetchInbox.mockResolvedValue([
      buildNotification({ id: 'n-1', readAt: null }),
    ]);

    const { user } = renderRoute(<NotificationBell />);

    await waitFor(() => expect(mockedFetchInbox).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const markAllBtn = await screen.findByRole('button', { name: /mark all read/i });
    await user.click(markAllBtn);

    expect(mockedMarkAllRead).toHaveBeenCalled();
  });

  it('sets up polling interval and polls after 30 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedFetchInbox.mockResolvedValue([]);

    renderRoute(<NotificationBell />);

    // Initial load
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockedFetchInbox).toHaveBeenCalledTimes(1);

    // Advance 30s
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(mockedFetchInbox).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('shows correct event icon for assignment events', async () => {
    mockedFetchInbox.mockResolvedValue([
      buildNotification({ id: 'n-1', eventType: 'assignment.approved', title: 'Assignment approved' }),
    ]);

    const { user } = renderRoute(<NotificationBell />);
    await waitFor(() => expect(mockedFetchInbox).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await screen.findByText('Assignment approved');
    expect(screen.getByText('👤')).toBeInTheDocument();
  });
});
