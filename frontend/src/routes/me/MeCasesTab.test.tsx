/**
 * W2-01 — /me?tab=cases — caller-scoped HR case list.
 *
 * Verifies:
 *   - The tab fetches via fetchMyCases() (self-scoped backend endpoint).
 *   - Loaded cases render in the table with case number + type + status.
 *   - The caller's role is shown as "Subject" when subjectPersonId === self,
 *     otherwise the participant role.
 *   - An empty list renders the EmptyState (UX Law 2 — forward action via
 *     the descriptive helper text).
 */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMyCasesMock = vi.fn();

vi.mock('@/lib/api/cases', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    fetchMyCases: (...args: unknown[]) => fetchMyCasesMock(...args),
  };
});

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: {
      authSource: 'bearer_token',
      displayName: 'Ethan Brooks',
      email: 'ethan.brooks@itco.local',
      personId: 'person-self',
      roles: ['employee'],
    },
  }),
}));

import { MeCasesTab } from './MeCasesTab';

const SUBJECT_CASE = {
  caseNumber: 'CASE-0001',
  caseTypeDisplayName: 'Onboarding',
  caseTypeKey: 'ONBOARDING',
  id: 'case-1',
  openedAt: '2026-05-20T09:00:00.000Z',
  ownerPersonId: 'person-owner',
  participants: [],
  status: 'OPEN',
  subjectPersonId: 'person-self',
  summary: 'Onboard to delivery team.',
};

const PARTICIPANT_CASE = {
  caseNumber: 'CASE-0002',
  caseTypeDisplayName: 'Transfer',
  caseTypeKey: 'TRANSFER',
  id: 'case-2',
  openedAt: '2026-04-01T09:00:00.000Z',
  ownerPersonId: 'person-owner',
  participants: [{ personId: 'person-self', role: 'OBSERVER' }],
  status: 'IN_PROGRESS',
  subjectPersonId: 'person-other',
  summary: 'Internal transfer review.',
};

describe('MeCasesTab (/me?tab=cases)', () => {
  beforeEach(() => {
    fetchMyCasesMock.mockReset();
  });

  it('renders caller-scoped cases in a table', async () => {
    fetchMyCasesMock.mockResolvedValue({
      items: [SUBJECT_CASE, PARTICIPANT_CASE],
      page: 1,
      pageSize: 2,
      total: 2,
    });

    render(<MeCasesTab />);

    await waitFor(() => {
      expect(fetchMyCasesMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('CASE-0001')).toBeInTheDocument();
    expect(screen.getByText('CASE-0002')).toBeInTheDocument();
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Transfer')).toBeInTheDocument();
  });

  it('labels caller as Subject when subjectPersonId matches', async () => {
    fetchMyCasesMock.mockResolvedValue({
      items: [SUBJECT_CASE],
      page: 1,
      pageSize: 1,
      total: 1,
    });

    render(<MeCasesTab />);

    expect(await screen.findByText('Subject')).toBeInTheDocument();
  });

  it('labels caller with participant role when not the subject', async () => {
    fetchMyCasesMock.mockResolvedValue({
      items: [PARTICIPANT_CASE],
      page: 1,
      pageSize: 1,
      total: 1,
    });

    render(<MeCasesTab />);

    expect(await screen.findByText('Observer')).toBeInTheDocument();
  });

  it('renders the empty state when the caller has no cases', async () => {
    fetchMyCasesMock.mockResolvedValue({ items: [], page: 1, pageSize: 0, total: 0 });

    render(<MeCasesTab />);

    expect(await screen.findByText('No cases yet')).toBeInTheDocument();
  });

  it('renders the error state when the fetch fails', async () => {
    fetchMyCasesMock.mockRejectedValue(new Error('boom'));

    render(<MeCasesTab />);

    expect(await screen.findByText("Couldn't load your cases")).toBeInTheDocument();
  });
});
