import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchThresholdConfigs,
  upsertThresholdConfig,
  type ThresholdConfigDto,
} from '@/lib/api/radiator-thresholds';
import { RadiatorThresholdsPage, validateThresholdRow } from './RadiatorThresholdsPage';

vi.mock('@/lib/api/radiator-thresholds', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/radiator-thresholds')>();
  return {
    ...actual,
    fetchThresholdConfigs: vi.fn(),
    upsertThresholdConfig: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedFetch = vi.mocked(fetchThresholdConfigs);
const mockedUpsert = vi.mocked(upsertThresholdConfig);

const higherRow: ThresholdConfigDto = {
  subDimensionKey: 'milestoneAdherence',
  thresholdScore4: 0.95,
  thresholdScore3: 0.85,
  thresholdScore2: 0.7,
  thresholdScore1: 0.5,
  direction: 'HIGHER_IS_BETTER',
  isDefault: true,
};

const lowerRow: ThresholdConfigDto = {
  subDimensionKey: 'scopeCreep',
  thresholdScore4: 0.05,
  thresholdScore3: 0.1,
  thresholdScore2: 0.2,
  thresholdScore1: 0.35,
  direction: 'LOWER_IS_BETTER',
  isDefault: true,
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <RadiatorThresholdsPage />
    </MemoryRouter>,
  );
}

describe('validateThresholdRow', () => {
  it('accepts strictly increasing t1<t2<t3<t4 for HIGHER_IS_BETTER', () => {
    expect(
      validateThresholdRow({
        direction: 'HIGHER_IS_BETTER',
        thresholdScore1: 0.5,
        thresholdScore2: 0.7,
        thresholdScore3: 0.85,
        thresholdScore4: 0.95,
      }),
    ).toBeNull();
  });

  it('rejects equal adjacent values for HIGHER_IS_BETTER', () => {
    expect(
      validateThresholdRow({
        direction: 'HIGHER_IS_BETTER',
        thresholdScore1: 0.5,
        thresholdScore2: 0.5,
        thresholdScore3: 0.85,
        thresholdScore4: 0.95,
      }),
    ).toBe('t1 < t2 < t3 < t4 required');
  });

  it('rejects out-of-order values for HIGHER_IS_BETTER', () => {
    expect(
      validateThresholdRow({
        direction: 'HIGHER_IS_BETTER',
        thresholdScore1: 0.9,
        thresholdScore2: 0.7,
        thresholdScore3: 0.85,
        thresholdScore4: 0.95,
      }),
    ).toBe('t1 < t2 < t3 < t4 required');
  });

  it('accepts strictly decreasing t1>t2>t3>t4 for LOWER_IS_BETTER', () => {
    expect(
      validateThresholdRow({
        direction: 'LOWER_IS_BETTER',
        thresholdScore1: 0.35,
        thresholdScore2: 0.2,
        thresholdScore3: 0.1,
        thresholdScore4: 0.05,
      }),
    ).toBeNull();
  });

  it('rejects HIGHER-style ordering when direction is LOWER_IS_BETTER', () => {
    expect(
      validateThresholdRow({
        direction: 'LOWER_IS_BETTER',
        thresholdScore1: 0.05,
        thresholdScore2: 0.1,
        thresholdScore3: 0.2,
        thresholdScore4: 0.35,
      }),
    ).toBe('t1 > t2 > t3 > t4 required');
  });

  it('rejects NaN values', () => {
    expect(
      validateThresholdRow({
        direction: 'HIGHER_IS_BETTER',
        thresholdScore1: Number.NaN,
        thresholdScore2: 0.7,
        thresholdScore3: 0.85,
        thresholdScore4: 0.95,
      }),
    ).toBe('All thresholds must be numbers.');
  });
});

describe('RadiatorThresholdsPage (W2-13)', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedUpsert.mockReset();
  });

  it('renders OK for valid rows and disables Save-all when nothing is dirty', async () => {
    mockedFetch.mockResolvedValue([higherRow, lowerRow]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('save-all-button')).toBeInTheDocument();
    });

    expect(screen.getByTestId('save-all-button')).toBeDisabled();
    expect(screen.getByTestId('dirty-summary')).toHaveTextContent('No unsaved changes');
  });

  it('shows validation error and disables row Save when ordering is broken', async () => {
    mockedFetch.mockResolvedValue([higherRow]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('save-all-button')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    // Drive t1 above t2, breaking the HIGHER_IS_BETTER invariant.
    const numberInputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // Column order: t4, t3, t2, t1 → index 3 is t1.
    const t1Input = numberInputs[3];
    await user.clear(t1Input);
    await user.type(t1Input, '0.99');

    await waitFor(() => {
      expect(screen.getByTestId('validation-error-milestoneAdherence')).toHaveTextContent('t1 < t2 < t3 < t4 required');
    });

    expect(screen.getByRole('button', { name: /^Save$/i })).toBeDisabled();
    expect(screen.getByTestId('save-all-button')).toBeDisabled();
    expect(screen.getByTestId('dirty-summary')).toHaveTextContent('1 unsaved change (1 invalid)');
  });

  it('enables Save-all when at least one row is dirty + valid, and saves all dirty rows', async () => {
    mockedFetch.mockResolvedValue([higherRow, lowerRow]);
    mockedUpsert.mockResolvedValue({ ok: true });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('save-all-button')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const numberInputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // Each row exposes 4 number inputs in t4/t3/t2/t1 order → row 0 = milestoneAdherence.
    // Change t4 of HIGHER_IS_BETTER row from 0.95 to 0.96 (still valid: 0.5 < 0.7 < 0.85 < 0.96).
    const t4Input = numberInputs[0];
    await user.clear(t4Input);
    await user.type(t4Input, '0.96');

    const saveAll = screen.getByTestId('save-all-button');
    await waitFor(() => expect(saveAll).not.toBeDisabled());
    expect(saveAll).toHaveTextContent('Save all (1)');

    await user.click(saveAll);

    await waitFor(() => {
      expect(mockedUpsert).toHaveBeenCalledTimes(1);
    });
    const [key, payload] = mockedUpsert.mock.calls[0];
    expect(key).toBe('milestoneAdherence');
    expect(payload.thresholdScore4).toBeCloseTo(0.96, 5);
    expect(payload.thresholdScore3).toBeCloseTo(0.85, 5);
    expect(payload.thresholdScore2).toBeCloseTo(0.7, 5);
    expect(payload.thresholdScore1).toBeCloseTo(0.5, 5);
    expect(payload.direction).toBe('HIGHER_IS_BETTER');
  });

  it('skips invalid rows when Save-all runs', async () => {
    mockedFetch.mockResolvedValue([higherRow, lowerRow]);
    mockedUpsert.mockResolvedValue({ ok: true });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('save-all-button')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const numberInputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // Make milestoneAdherence INVALID by raising t1 above t2.
    const milestoneT1 = numberInputs[3];
    await user.clear(milestoneT1);
    await user.type(milestoneT1, '0.99');

    // Make scopeCreep valid-dirty by lowering t4 from 0.05 to 0.04 (still LOWER_IS_BETTER monotone).
    const scopeCreepT4 = numberInputs[4];
    await user.clear(scopeCreepT4);
    await user.type(scopeCreepT4, '0.04');

    const saveAll = screen.getByTestId('save-all-button');
    await waitFor(() => expect(saveAll).toHaveTextContent('Save all (1)'));

    await user.click(saveAll);

    await waitFor(() => {
      expect(mockedUpsert).toHaveBeenCalledTimes(1);
    });
    const [key] = mockedUpsert.mock.calls[0];
    expect(key).toBe('scopeCreep');
  });

  it('keeps a row dirty after a failed save-all so the user can retry', async () => {
    mockedFetch.mockResolvedValue([higherRow]);
    mockedUpsert.mockRejectedValue(new Error('boom'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('save-all-button')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const numberInputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    const t4Input = numberInputs[0];
    await user.clear(t4Input);
    await user.type(t4Input, '0.96');

    const saveAll = screen.getByTestId('save-all-button');
    await waitFor(() => expect(saveAll).not.toBeDisabled());
    await user.click(saveAll);

    await waitFor(() => {
      expect(mockedUpsert).toHaveBeenCalled();
    });
    // The row should still be dirty because the save failed; Save-all should remain enabled.
    await waitFor(() => {
      expect(within(screen.getByTestId('dirty-summary')).queryByText(/1 unsaved change/)).toBeInTheDocument();
    });
  });
});
