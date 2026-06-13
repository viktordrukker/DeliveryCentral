import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BenchInspector } from './BenchInspector';
import type { BenchEnrichedRowDto } from '@/lib/api/people-bench';
import type { PersonSuggestedPosition } from '@/lib/api/project-positions';

// BE-track — Bench suggested-fills endpoint is mocked so each test can shape
// the ranked positions independently. Default = empty.
const fetchSuggestionsMock = vi.fn();
vi.mock('@/lib/api/project-positions', () => ({
  fetchPersonSuggestedPositions: (...args: unknown[]) => fetchSuggestionsMock(...args),
}));

const baseRow: BenchEnrichedRowDto = {
  personId: 'p-1',
  personPublicId: 'usr_p1',
  name: 'Ada Lovelace',
  role: 'Engineer',
  office: 'London',
  grade: 'L4',
  isOnBench: true,
  daysOnBench: 22,
  daysOnBenchBasis: 'fill-history',
  availabilityHours14d: 64,
  suggestedProjectIds: [],
};

function suggestion(over: Partial<PersonSuggestedPosition> = {}): PersonSuggestedPosition {
  return {
    positionId: 'pos-1',
    projectId: 'proj-1',
    projectName: 'Apollo',
    role: 'Senior Engineer',
    matchScore: 0.88,
    matchedSkills: ['React', 'Node'],
    missingSkills: [],
    ...over,
  };
}

function renderInspector(row: Partial<BenchEnrichedRowDto> = {}, onClose = vi.fn()): { onClose: ReturnType<typeof vi.fn> } {
  render(
    <MemoryRouter>
      <BenchInspector row={{ ...baseRow, ...row }} onClose={onClose} />
    </MemoryRouter>,
  );
  return { onClose };
}

beforeEach(() => {
  // Default the fetch to no suggestions; individual tests override.
  fetchSuggestionsMock.mockReset();
  fetchSuggestionsMock.mockResolvedValue({ personId: 'p-1',
  personPublicId: 'usr_p1', candidates: [] });
});

describe('BenchInspector', () => {
  it('renders identity, days idle, availability, and headroom', () => {
    renderInspector({ daysOnBench: 22, availabilityHours14d: 64 });
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Engineer.*L4.*London/)).toBeInTheDocument();
    expect(screen.getByText('22d')).toBeInTheDocument();
    expect(screen.getByText('64h')).toBeInTheDocument();
    // headroom = 64/80 = 80%
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows empty-state when the suggested-positions endpoint returns no candidates', async () => {
    fetchSuggestionsMock.mockResolvedValue({ personId: 'p-1',
  personPublicId: 'usr_p1', candidates: [] });
    renderInspector();
    await waitFor(() =>
      expect(screen.getByText(/No matching open positions found/i)).toBeInTheDocument(),
    );
    expect(fetchSuggestionsMock).toHaveBeenCalledWith('p-1', 5);
  });

  it('lists ranked positions (role · project · match%) with deep-links to the position detail', async () => {
    fetchSuggestionsMock.mockResolvedValue({
      personId: 'p-1',
  personPublicId: 'usr_p1',
      candidates: [
        suggestion({ positionId: 'pos-a', projectId: 'proj-a', projectName: 'Apollo', role: 'Senior Engineer', matchScore: 0.88 }),
        suggestion({ positionId: 'pos-b', projectId: 'proj-b', projectName: 'Atlas', role: 'Tech Lead', matchScore: 0.62 }),
      ],
    });
    renderInspector();
    await waitFor(() => expect(screen.getByText('Suggested fills (2)')).toBeInTheDocument());
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('62%')).toBeInTheDocument();
    // Each row links to /projects/:projectId/positions/:positionId (real route).
    const linkA = screen.getByRole('link', { name: /Senior Engineer.*Apollo/ });
    const linkB = screen.getByRole('link', { name: /Tech Lead.*Atlas/ });
    expect(linkA).toHaveAttribute('href', '/projects/proj-a/positions/pos-a');
    expect(linkB).toHaveAttribute('href', '/projects/proj-b/positions/pos-b');
  });

  it('disables "Propose to position" when the suggested-positions fetch returns empty', async () => {
    fetchSuggestionsMock.mockResolvedValue({ personId: 'p-1',
  personPublicId: 'usr_p1', candidates: [] });
    renderInspector();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Propose to position' })).toBeDisabled());
  });

  it('enables "Propose to position" when at least one suggestion exists', async () => {
    fetchSuggestionsMock.mockResolvedValue({ personId: 'p-1',
  personPublicId: 'usr_p1', candidates: [suggestion()] });
    renderInspector();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Propose to position' })).toBeEnabled());
  });

  it('fires onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderInspector();
    await user.click(screen.getByRole('button', { name: /close inspector/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('links "Open profile" to /people/:publicId', () => {
    // W1-09 — URL now uses the opaque publicId; override both fields so the
    // fixture stays internally consistent.
    renderInspector({ personId: 'p-42', personPublicId: 'usr_p-42' });
    expect(screen.getByRole('link', { name: 'Open profile' })).toHaveAttribute('href', '/people/usr_p-42');
  });

  it('soft-navigates on Propose (records return-path in sessionStorage; no hard nav)', async () => {
    fetchSuggestionsMock.mockResolvedValue({ personId: 'p-1',
  personPublicId: 'usr_p1', candidates: [suggestion()] });
    const user = userEvent.setup();
    sessionStorage.removeItem('bench:returnTo');

    renderInspector({ personId: 'p-7' });
    const button = await screen.findByRole('button', { name: 'Propose to position' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    // Return-path was captured for scroll restoration — proves soft-nav path
    // executed (the legacy `window.location.href = ...` branch wrote nothing
    // to sessionStorage). Use a permissive regex since MemoryRouter exposes
    // the start path; the key check is that the side-effect ran.
    expect(sessionStorage.getItem('bench:returnTo')).not.toBeNull();
  });
});
