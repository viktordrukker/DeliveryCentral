import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import {
  getTourProgress,
  upsertTourProgress,
  type OnboardingTourProgress,
} from '@/lib/api/help';
import { OnboardingTourProvider } from './OnboardingTourProvider';

vi.mock('@/lib/api/help', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/help')>();
  return {
    ...actual,
    getTourProgress: vi.fn(),
    upsertTourProgress: vi.fn(),
  };
});

const mockedGet = vi.mocked(getTourProgress);
const mockedUpsert = vi.mocked(upsertTourProgress);

const SYNTHETIC_EMPTY: OnboardingTourProgress = { tourKey: 'welcome', completedSteps: [] };
const ALREADY_DISMISSED: OnboardingTourProgress = {
  personId: 'p-1',
  tourKey: 'welcome',
  completedSteps: [],
  dismissedAt: '2026-05-01T00:00:00Z',
  completedAt: null,
  updatedAt: '2026-05-01T00:00:00Z',
};

describe('OnboardingTourProvider', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedUpsert.mockReset();
  });

  it('auto-opens the welcome tour when the user has no prior progress (synthetic empty shape)', async () => {
    mockedGet.mockResolvedValue(SYNTHETIC_EMPTY);
    render(
      <OnboardingTourProvider>
        <div>app shell content</div>
      </OnboardingTourProvider>,
    );

    // Step 0 has anchor=null → centered Modal with the welcome title.
    await waitFor(() => {
      expect(screen.getByText(/Welcome to DeliveryCentral/)).toBeInTheDocument();
    });
    // Children still render under the modal.
    expect(screen.getByText('app shell content')).toBeInTheDocument();
  });

  it('does NOT auto-open when the user has previously dismissed the tour', async () => {
    mockedGet.mockResolvedValue(ALREADY_DISMISSED);
    render(
      <OnboardingTourProvider>
        <div>app shell content</div>
      </OnboardingTourProvider>,
    );

    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    // Welcome modal does NOT appear.
    expect(screen.queryByText(/Welcome to DeliveryCentral/)).toBeNull();
  });

  it('Skip persists `dismissed=true` and closes the tour', async () => {
    mockedGet.mockResolvedValue(SYNTHETIC_EMPTY);
    mockedUpsert.mockResolvedValue({ ...ALREADY_DISMISSED });
    render(
      <OnboardingTourProvider>
        <div>app shell content</div>
      </OnboardingTourProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome to DeliveryCentral/)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /Skip tour/i }));

    await waitFor(() => {
      expect(mockedUpsert).toHaveBeenCalledWith('welcome', { dismissed: true });
    });
    // Modal closed.
    expect(screen.queryByText(/Welcome to DeliveryCentral/)).toBeNull();
  });

  it('clicking Next advances past the intro modal and shows step 2', async () => {
    // Note: rendering anchored Popover steps requires real layout
    // (getBoundingClientRect) which jsdom doesn't compute. When the
    // anchor element isn't found OR the popover's getBoundingClientRect
    // returns zeros, the AnchoredPopoverStep falls back to a centered
    // Modal with the same title. We assert the title shows up in
    // either form, which is what end users will see in either path.
    mockedGet.mockResolvedValue(SYNTHETIC_EMPTY);
    mockedUpsert.mockResolvedValue({ ...SYNTHETIC_EMPTY });
    render(
      <OnboardingTourProvider>
        <div>app shell content</div>
      </OnboardingTourProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome to DeliveryCentral/)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /^Next$/ }));

    // Step 2 title (either in Modal-fallback or in Popover) — its body
    // text always appears regardless of which renderer wins.
    await waitFor(() => {
      const matches = screen.queryAllByText(/sidebar groups everything/i);
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
