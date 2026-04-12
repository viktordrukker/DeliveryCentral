import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchPulseHistory, submitPulse } from '@/lib/api/pulse';
import { PulseWidget } from './PulseWidget';

vi.mock('@/lib/api/pulse', () => ({
  fetchPulseHistory: vi.fn(),
  submitPulse: vi.fn(),
  fetchPerson360: vi.fn(),
  fetchMoodHeatmap: vi.fn(),
}));

const mockedFetchPulseHistory = vi.mocked(fetchPulseHistory);
const mockedSubmitPulse = vi.mocked(submitPulse);

/** Returns a week-start string for Monday N weeks ago */
function weekStartNWeeksAgo(n: number): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff - n * 7);
  return d.toISOString().slice(0, 10);
}

function renderWidget() {
  return render(
    <MemoryRouter>
      <PulseWidget />
    </MemoryRouter>,
  );
}

describe('PulseWidget', () => {
  beforeEach(() => {
    mockedFetchPulseHistory.mockReset();
    mockedSubmitPulse.mockReset();
  });

  it('renders mood buttons after loading with empty history', async () => {
    mockedFetchPulseHistory.mockResolvedValue({ entries: [], frequency: 'weekly' });

    renderWidget();

    expect(await screen.findByTestId('pulse-widget')).toBeInTheDocument();
    expect(screen.getByText('How are you feeling this week?')).toBeInTheDocument();
    expect(screen.getByLabelText('Struggling (1)')).toBeInTheDocument();
    expect(screen.getByLabelText('Great (5)')).toBeInTheDocument();
  });

  it('submits a mood and shows success message', async () => {
    mockedFetchPulseHistory.mockResolvedValue({ entries: [], frequency: 'weekly' });

    const submittedWeek = weekStartNWeeksAgo(0);
    mockedSubmitPulse.mockResolvedValue({
      id: 'pulse-1',
      personId: 'p-1',
      weekStart: submittedWeek,
      mood: 4,
      submittedAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    renderWidget();

    // Wait for loading to finish
    expect(await screen.findByLabelText('Good (4)')).toBeInTheDocument();

    // Click mood button 4
    await user.click(screen.getByLabelText('Good (4)'));

    // Submit button appears after mood selection
    const submitBtn = await screen.findByRole('button', { name: 'Submit' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockedSubmitPulse).toHaveBeenCalledWith({ mood: 4, note: undefined });
    });

    // After submission the section collapses and shows the submitted badge
    expect(await screen.findByTestId('pulse-submitted-badge')).toHaveTextContent('see you next week');
  });

  it('shows history dots for previous weeks', async () => {
    const w1 = weekStartNWeeksAgo(1);
    const w2 = weekStartNWeeksAgo(2);

    mockedFetchPulseHistory.mockResolvedValue({
      entries: [
        { id: 'pe-1', personId: 'p-1', weekStart: w1, mood: 3, submittedAt: new Date().toISOString() },
        { id: 'pe-2', personId: 'p-1', weekStart: w2, mood: 5, submittedAt: new Date().toISOString() },
      ],
      frequency: 'weekly',
    });

    renderWidget();

    // Wait for widget to load
    await screen.findByTestId('pulse-widget');

    // History section should be visible since there are past entries
    expect(await screen.findByTestId('pulse-history')).toBeInTheDocument();
    expect(screen.getByTestId(`history-dot-${w1}`)).toBeInTheDocument();
    expect(screen.getByTestId(`history-dot-${w2}`)).toBeInTheDocument();
  });

  it('shows already submitted state for current week', async () => {
    const currentWeek = weekStartNWeeksAgo(0);

    mockedFetchPulseHistory.mockResolvedValue({
      entries: [
        {
          id: 'pe-1',
          personId: 'p-1',
          weekStart: currentWeek,
          mood: 5,
          submittedAt: new Date().toISOString(),
        },
      ],
      frequency: 'weekly',
    });

    renderWidget();

    await screen.findByTestId('pulse-submitted-badge');
    expect(screen.getByTestId('pulse-submitted-badge')).toHaveTextContent('see you next week');

    // Mood buttons should not be visible after submission (section is collapsed)
    expect(screen.queryAllByRole('button', { name: /Struggling|Stressed|Neutral|Good|Great/ })).toHaveLength(0);
  });
});
