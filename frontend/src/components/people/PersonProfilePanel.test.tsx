import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { PersonProfilePanel } from './PersonProfilePanel';
import type { PersonProfileDto } from '@/lib/api/person-profile';

const fetchPersonProfile = vi.fn();
const fetchEmployeeActivity = vi.fn();

vi.mock('@/lib/api/person-profile', () => ({
  fetchPersonProfile: (id: string) => fetchPersonProfile(id),
}));

vi.mock('@/lib/api/employee-activity', () => ({
  fetchEmployeeActivity: (id: string, limit?: number) => fetchEmployeeActivity(id, limit),
}));

const sampleProfile: PersonProfileDto = {
  person: {
    id: 'p1',
    displayName: 'Ada Lovelace',
    givenName: 'Ada',
    familyName: 'Lovelace',
    primaryEmail: 'ada@example.com',
    role: 'Senior Engineer',
    grade: 'L5',
    location: 'London',
    timezone: 'Europe/London',
    employmentStatus: 'ACTIVE',
    hiredAt: '2022-03-01',
  },
  assignments: [
    {
      id: 'a1',
      projectId: 'proj-1',
      projectName: 'Apollo',
      staffingRole: 'Tech Lead',
      status: 'ACTIVE',
      allocationPercent: 60,
      validFrom: '2026-01-01',
      validTo: null,
    },
    {
      id: 'a2',
      projectId: 'proj-2',
      projectName: 'Atlas',
      staffingRole: 'Architect',
      status: 'ACTIVE',
      allocationPercent: 40,
      validFrom: '2026-03-01',
      validTo: null,
    },
  ],
  timesheetSummary: { last4WeeksHours: 152, leaveHours: 8, overtimeHours: 4 },
  leaveBalance: [
    { type: 'annual', entitlement: 25, used: 10, pending: 2, remaining: 13 },
  ],
  managerChain: [
    { personId: 'p2', displayName: 'Grace Hopper', relationshipType: 'manager' },
  ],
  skills: [
    { skillId: 's1', skillName: 'TypeScript', proficiency: 5, certified: true },
    { skillId: 's2', skillName: 'Postgres', proficiency: 4, certified: false },
  ],
  pools: [
    { resourcePoolId: 'pool-1', resourcePoolName: 'Platform', isPrimary: true },
  ],
};

describe('PersonProfilePanel', () => {
  beforeEach(() => {
    // PersonActivityFeed (V2-A.13) fetches its own data; default to none.
    fetchEmployeeActivity.mockResolvedValue([]);
  });

  it('renders identity card with role / grade / location', async () => {
    fetchPersonProfile.mockResolvedValue(sampleProfile);
    renderRoute(<PersonProfilePanel personId="p1" />);
    await waitFor(() => expect(screen.getByTestId('person-profile-panel')).toBeInTheDocument());
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Senior Engineer · L5 · London/)).toBeInTheDocument();
  });

  it('renders cost-rate KPI when costRate is present', async () => {
    fetchPersonProfile.mockResolvedValue({ ...sampleProfile, costRate: 95.5 });
    renderRoute(<PersonProfilePanel personId="p1" />);
    await waitFor(() => expect(screen.getByText('Cost rate')).toBeInTheDocument());
  });

  it('A13: surfaces the Recent activity feed (PersonActivityFeed)', async () => {
    fetchPersonProfile.mockResolvedValue(sampleProfile);
    renderRoute(<PersonProfilePanel personId="p1" />);
    await waitFor(() => expect(screen.getByText('Recent activity')).toBeInTheDocument());
    // feed fetched for this person
    expect(fetchEmployeeActivity).toHaveBeenCalledWith('p1', 10);
  });

  it('omits cost-rate KPI when costRate is absent (redacted)', async () => {
    fetchPersonProfile.mockResolvedValue(sampleProfile);
    renderRoute(<PersonProfilePanel personId="p1" />);
    await waitFor(() => expect(screen.getByTestId('person-profile-panel')).toBeInTheDocument());
    expect(screen.queryByText('Cost rate')).not.toBeInTheDocument();
  });

  it('shows KPI strip with active assignments + total allocation + 4w hours + overtime', async () => {
    fetchPersonProfile.mockResolvedValue(sampleProfile);
    renderRoute(<PersonProfilePanel personId="p1" />);
    await waitFor(() => expect(screen.getByTestId('person-profile-kpis')).toBeInTheDocument());
    expect(screen.getByText('Active assignments')).toBeInTheDocument();
    expect(screen.getByText('Total allocation')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('152h')).toBeInTheDocument();
  });

  it('renders assignments table with project deep-links', async () => {
    fetchPersonProfile.mockResolvedValue(sampleProfile);
    renderRoute(<PersonProfilePanel personId="p1" />);
    await waitFor(() => expect(screen.getByTestId('person-profile-assignments')).toBeInTheDocument());
    const apolloLink = screen.getByRole('link', { name: 'Apollo' });
    expect(apolloLink.getAttribute('href')).toBe('/projects/proj-1');
  });

  it('renders skills as pip bars with proficiency aria-labels (B21)', async () => {
    fetchPersonProfile.mockResolvedValue(sampleProfile);
    renderRoute(<PersonProfilePanel personId="p1" />);
    await waitFor(() => expect(screen.getByTestId('person-profile-skills')).toBeInTheDocument());
    expect(screen.getByText(/TypeScript/)).toBeInTheDocument();
    expect(screen.getByText('Postgres')).toBeInTheDocument();
    // proficiency now renders as a 1–5 pip bar with an aria-label, not "· N"
    expect(screen.getByLabelText('Proficiency 5 of 5')).toBeInTheDocument();
    expect(screen.getByLabelText('Proficiency 4 of 5')).toBeInTheDocument();
  });

  it('renders leave balance with negative-remaining tone', async () => {
    const profile = {
      ...sampleProfile,
      leaveBalance: [
        { type: 'annual', entitlement: 5, used: 8, pending: 0, remaining: -3 },
      ],
    };
    fetchPersonProfile.mockResolvedValue(profile);
    renderRoute(<PersonProfilePanel personId="p1" />);
    await waitFor(() => expect(screen.getByText('annual')).toBeInTheDocument());
    const remaining = screen.getByText('-3');
    expect(remaining.style.color).toContain('status-danger');
  });

  it('renders manager chain with deep-link to manager profile', async () => {
    fetchPersonProfile.mockResolvedValue(sampleProfile);
    renderRoute(<PersonProfilePanel personId="p1" />);
    await waitFor(() => expect(screen.getByText('Grace Hopper')).toBeInTheDocument());
    const managerLink = screen.getByRole('link', { name: 'Grace Hopper' });
    expect(managerLink.getAttribute('href')).toBe('/people/p2');
  });

  it('shows error state on fetch failure', async () => {
    fetchPersonProfile.mockRejectedValue(new Error('Boom'));
    renderRoute(<PersonProfilePanel personId="p1" />);
    await waitFor(() => expect(screen.getByText(/Boom/)).toBeInTheDocument());
  });
});
