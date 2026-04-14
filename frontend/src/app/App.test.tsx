import { screen } from '@testing-library/react';
import { vi } from 'vitest';

import { appRoutes } from '@/app/navigation';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { renderRoute } from '@test/render-route';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'user-1', roles: ['admin'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/inbox', () => ({
  fetchInbox: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn(),
  markAllRead: vi.fn(),
}));

describe('App shell navigation', () => {
  it('renders primary navigation routes', () => {
    renderRoute(<SidebarNav activePath="/" routes={appRoutes} />);

    // Brand and always-visible sidebar structure
    expect(screen.getByText('Workload Tracking')).toBeInTheDocument();
    // Active group (dashboards) items are visible
    expect(screen.getByText('Workload Overview')).toBeInTheDocument();
    // Section group headers are always rendered (collapsed sections show header)
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('People & Org')).toBeInTheDocument();
  });
});
