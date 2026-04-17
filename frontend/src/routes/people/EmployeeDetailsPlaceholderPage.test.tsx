import { screen } from '@testing-library/react';
import { vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { EmployeeDetailsPlaceholderPage } from './EmployeeDetailsPlaceholderPage';

vi.mock('@/lib/api/employee-activity', () => ({
  fetchEmployeeActivity: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/features/people/useEmployeeDetails', () => ({
  useEmployeeDetails: () => ({
    data: {
      id: 'person-1',
      displayName: 'Ethan Brooks',
      primaryEmail: 'ethan@example.com',
      grade: 'Senior',
      department: 'Engineering',
      employmentStatus: 'ACTIVE',
      currentLineManager: { id: 'mgr-1', displayName: 'Sophia Kim' },
      skills: [],
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/features/people/useReportingLineManagement', () => ({
  useReportingLineManagement: () => ({
    lineManager: null,
    directReports: [],
    isLoading: false,
    reassign: vi.fn(),
    terminate: vi.fn(),
  }),
}));

vi.mock('@/lib/api/person-directory', () => ({
  deactivateEmployee: vi.fn(),
  terminateEmployee: vi.fn(),
}));

vi.mock('@/lib/api/reporting-lines', () => ({
  terminateReportingLine: vi.fn(),
}));

vi.mock('@/lib/api/business-audit', () => ({
  fetchBusinessAudit: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

vi.mock('@/lib/api/work-evidence', () => ({
  fetchWorkEvidence: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'admin-1', roles: ['admin'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: 'person-1' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

describe('EmployeeDetailsPlaceholderPage', () => {
  it.skip('renders person profile', async () => {
    renderRoute(<EmployeeDetailsPlaceholderPage />);

    expect(await screen.findByText('Ethan Brooks')).toBeInTheDocument();
  });

  it.skip('shows loading state', async () => {
    const mod = await import('@/features/people/useEmployeeDetails');
    vi.mocked(mod.useEmployeeDetails).mockReturnValueOnce({ data: undefined, isLoading: true, error: undefined, notFound: false } as unknown as ReturnType<typeof mod.useEmployeeDetails>);

    renderRoute(<EmployeeDetailsPlaceholderPage />);

    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });
});
