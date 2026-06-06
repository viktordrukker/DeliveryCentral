import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { CpiWhatIfCard } from './CpiWhatIfCard';

const cpiWhatIfMock = vi.fn();

vi.mock('@/lib/api/capitalisation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/capitalisation')>();
  return {
    ...actual,
    cpiWhatIf: (projectId: string, scenario: unknown) =>
      cpiWhatIfMock(projectId, scenario),
  };
});

beforeEach(() => {
  cpiWhatIfMock.mockReset();
});

describe('CpiWhatIfCard (LEAN-P4-missing-7)', () => {
  it('renders the scenario form with one initial row', () => {
    renderRoute(<CpiWhatIfCard projectId="proj-1" />);
    expect(screen.getByTestId('cpi-what-if-card')).toBeInTheDocument();
    expect(screen.getByTestId('cpi-row-role-0')).toBeInTheDocument();
    expect(screen.getByTestId('cpi-row-rate-0')).toBeInTheDocument();
    expect(screen.getByTestId('cpi-row-months-0')).toBeInTheDocument();
    expect(screen.getByTestId('cpi-row-qty-0')).toBeInTheDocument();
  });

  it('submits scenario and displays the projection', async () => {
    cpiWhatIfMock.mockResolvedValueOnce({
      baselineCPI: 0.95,
      projectedCPI: 0.73,
      deltaACWP: 60000,
      warningThreshold: 'RED',
      explanation: 'Scenario adds 2 people ($60,000 cost). CPI 0.95 → 0.73 (RED).',
    });

    renderRoute(<CpiWhatIfCard projectId="proj-1" />);

    fireEvent.change(screen.getByTestId('cpi-row-role-0'), {
      target: { value: 'Senior FE' },
    });
    fireEvent.change(screen.getByTestId('cpi-row-rate-0'), {
      target: { value: '10000' },
    });
    fireEvent.change(screen.getByTestId('cpi-row-months-0'), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByTestId('cpi-row-qty-0'), {
      target: { value: '2' },
    });

    fireEvent.click(screen.getByTestId('cpi-project-button'));

    await waitFor(() => {
      expect(screen.getByTestId('cpi-what-if-result')).toBeInTheDocument();
    });

    expect(cpiWhatIfMock).toHaveBeenCalledWith('proj-1', {
      scenarioPeople: [
        { role: 'Senior FE', monthlyRate: 10000, monthsRemaining: 3, quantity: 2 },
      ],
      scenarioAdditionalHours: undefined,
    });

    expect(screen.getByTestId('cpi-baseline-value')).toHaveTextContent('0.95');
    expect(screen.getByTestId('cpi-projected-value')).toHaveTextContent('0.73');
    expect(screen.getByTestId('cpi-delta-acwp')).toHaveTextContent('$60,000');
    expect(screen.getByTestId('cpi-projected-value')).toHaveTextContent('RED');
    expect(screen.getByTestId('cpi-explanation')).toHaveTextContent(
      'Scenario adds 2 people',
    );
  });

  it('adds and removes scenario rows', () => {
    renderRoute(<CpiWhatIfCard projectId="proj-1" />);
    expect(screen.queryByTestId('cpi-row-role-1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cpi-add-row'));
    expect(screen.getByTestId('cpi-row-role-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cpi-row-remove-1'));
    expect(screen.queryByTestId('cpi-row-role-1')).not.toBeInTheDocument();
  });

  it('disables the only remove button when there is just one row', () => {
    renderRoute(<CpiWhatIfCard projectId="proj-1" />);
    expect(screen.getByTestId('cpi-row-remove-0')).toBeDisabled();
  });

  it('passes scenarioAdditionalHours when > 0', async () => {
    cpiWhatIfMock.mockResolvedValueOnce({
      baselineCPI: 1,
      projectedCPI: 0.5,
      deltaACWP: 500,
      warningThreshold: 'RED',
      explanation: 'ok',
    });

    renderRoute(<CpiWhatIfCard projectId="proj-1" />);
    fireEvent.change(screen.getByTestId('cpi-additional-hours'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByTestId('cpi-project-button'));

    await waitFor(() => {
      expect(cpiWhatIfMock).toHaveBeenCalled();
    });
    expect(cpiWhatIfMock.mock.calls[0]![1]).toMatchObject({
      scenarioAdditionalHours: 5,
    });
  });

  it('renders an error when the API rejects', async () => {
    cpiWhatIfMock.mockRejectedValueOnce(new Error('boom'));
    renderRoute(<CpiWhatIfCard projectId="proj-1" />);
    fireEvent.click(screen.getByTestId('cpi-project-button'));

    await waitFor(() => {
      expect(screen.getByTestId('cpi-what-if-error')).toHaveTextContent('boom');
    });
    expect(screen.queryByTestId('cpi-what-if-result')).not.toBeInTheDocument();
  });

  it('shows GREEN tone when projected CPI grade is GREEN', async () => {
    cpiWhatIfMock.mockResolvedValueOnce({
      baselineCPI: 1.0,
      projectedCPI: 0.99,
      deltaACWP: 100,
      warningThreshold: 'GREEN',
      explanation: 'ok',
    });
    renderRoute(<CpiWhatIfCard projectId="proj-1" />);
    fireEvent.click(screen.getByTestId('cpi-project-button'));
    await waitFor(() => {
      expect(screen.getByTestId('cpi-projected-value')).toHaveTextContent('GREEN');
    });
  });
});
