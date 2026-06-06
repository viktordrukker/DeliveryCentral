/**
 * MANUAL-CLICK-THROUGH-30 — admin checklist page coverage.
 *
 * Verifies the matrix renders one row per journey + one cell per role,
 * NOT_APPLICABLE cells are read-only, editable cells cycle through the
 * observation states, and the save handler ships the right payload.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchSoakChecklist,
  saveSoakChecklist,
} from '@/lib/api/v2-soak-checklist';

import { V2SoakChecklistPage } from './V2SoakChecklistPage';
import { SOAK_JOURNEYS, SOAK_ROLES } from './v2-soak-journeys';

vi.mock('@/lib/api/v2-soak-checklist', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/v2-soak-checklist')>();
  return {
    ...actual,
    fetchSoakChecklist: vi.fn(),
    saveSoakChecklist: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedFetch = vi.mocked(fetchSoakChecklist);
const mockedSave = vi.mocked(saveSoakChecklist);

function renderPage(): void {
  render(
    <MemoryRouter>
      <V2SoakChecklistPage />
    </MemoryRouter>,
  );
}

describe('V2SoakChecklistPage (MANUAL-CLICK-THROUGH-30)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetch.mockResolvedValue({
      state: {
        sessionId: 'test',
        startedAt: '2026-06-06T00:00:00.000Z',
        updatedAt: '2026-06-06T00:00:00.000Z',
        cells: [],
      },
    });
  });

  it('renders every journey x role cell in the matrix', async () => {
    renderPage();
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    const matrix = await screen.findByTestId('soak-matrix');
    for (const j of SOAK_JOURNEYS) {
      for (const role of SOAK_ROLES) {
        expect(within(matrix).getByTestId(`soak-cell-${j.id}-${role}`)).toBeInTheDocument();
      }
    }
  });

  it('NOT_APPLICABLE cells render as plain "N/A" text instead of a button', async () => {
    renderPage();
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    // J-21 (Admin setup wizard) is admin-only; employee row is NOT_APPLICABLE.
    const cell = await screen.findByTestId('soak-cell-J-21-employee');
    expect(cell.tagName).toBe('SPAN');
    expect(cell).toHaveTextContent('N/A');
  });

  it('clicking an editable cell cycles NOT_RUN -> PASS -> FAIL', async () => {
    renderPage();
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    const cell = await screen.findByTestId('soak-cell-J-01-employee');
    expect(cell.tagName).toBe('BUTTON');
    expect(cell).toHaveAttribute('aria-label', expect.stringMatching(/NOT_RUN/));
    await userEvent.click(cell);
    expect(cell).toHaveAttribute('aria-label', expect.stringMatching(/PASS/));
    await userEvent.click(cell);
    expect(cell).toHaveAttribute('aria-label', expect.stringMatching(/FAIL/));
  });

  it('Save observations posts a non-NOT_RUN cell payload to the API', async () => {
    mockedSave.mockResolvedValue({
      state: {
        sessionId: 'test',
        startedAt: '2026-06-06T00:00:00.000Z',
        updatedAt: '2026-06-06T00:00:00.000Z',
        cells: [],
      },
      summary: {
        totalGated: 100,
        pass: 1,
        fail: 0,
        blocked: 0,
        notRun: 99,
        regressions: 0,
        cutoverReady: false,
      },
    });
    renderPage();
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    const cell = await screen.findByTestId('soak-cell-J-01-employee');
    await userEvent.click(cell); // cycle to PASS
    await userEvent.click(screen.getByTestId('soak-save-button'));
    await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
    const [, sentCells] = mockedSave.mock.calls[0]!;
    expect(sentCells).toHaveLength(1);
    expect(sentCells[0]).toMatchObject({
      journeyId: 'J-01',
      role: 'employee',
      observation: 'PASS',
    });
  });

  it('renders the cutover-readiness summary when one is returned', async () => {
    mockedFetch.mockResolvedValue({
      state: {
        sessionId: 'test',
        startedAt: '2026-06-06T00:00:00.000Z',
        updatedAt: '2026-06-06T00:00:00.000Z',
        cells: [],
      },
      summary: {
        totalGated: 100,
        pass: 100,
        fail: 0,
        blocked: 0,
        notRun: 0,
        regressions: 0,
        cutoverReady: true,
      },
    });
    renderPage();
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
    const strip = await screen.findByTestId('soak-summary-strip');
    expect(within(strip).getByText('READY')).toBeInTheDocument();
  });
});
