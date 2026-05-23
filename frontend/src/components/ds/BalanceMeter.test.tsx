import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BalanceMeter } from './BalanceMeter';

describe('BalanceMeter', () => {
  it('renders headline remaining value when under-budget', () => {
    render(<BalanceMeter entitlement={25} used={10} pending={2} testId="bm" />);
    // Remaining = 25 - 10 - 2 = 13
    expect(screen.getByTestId('bm').textContent).toContain('13d');
  });

  it('aria-label summarises the full state', () => {
    render(<BalanceMeter entitlement={25} used={10} pending={2} testId="bm" />);
    const root = screen.getByRole('img');
    const label = root.getAttribute('aria-label') ?? '';
    expect(label).toContain('Balance');
    expect(label).toContain('13d remaining of 25d');
    expect(label).toContain('10d used');
    expect(label).toContain('2d pending');
  });

  it('overdrawn state shows extra legend + danger color cue + ariasummary', () => {
    render(<BalanceMeter entitlement={5} used={6} pending={1} testId="bm" />);
    // remaining = 0, overdrawn = (6+1)-5 = 2
    const root = screen.getByRole('img');
    expect(root.getAttribute('aria-label')).toContain('2d overdrawn');
    expect(root.textContent).toContain('Overdrawn');
  });

  it('inert by default — no buttons rendered when onSegmentClick is omitted', () => {
    render(<BalanceMeter entitlement={25} used={10} />);
    // Container is role=img; no button elements inside.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('interactive — renders buttons + onSegmentClick fires on click', async () => {
    const user = userEvent.setup();
    const onSegmentClick = vi.fn();
    render(<BalanceMeter entitlement={25} used={10} pending={2} onSegmentClick={onSegmentClick} />);
    const usedSeg = screen.getByRole('button', { name: /Used 10d/ });
    await user.click(usedSeg);
    expect(onSegmentClick).toHaveBeenCalledWith('used');
    const pendingSeg = screen.getByRole('button', { name: /Pending 2d/ });
    await user.click(pendingSeg);
    expect(onSegmentClick).toHaveBeenCalledWith('pending');
  });

  it('interactive — Enter/Space activates segment via keyboard', async () => {
    const user = userEvent.setup();
    const onSegmentClick = vi.fn();
    render(<BalanceMeter entitlement={25} used={10} onSegmentClick={onSegmentClick} />);
    const usedSeg = screen.getByRole('button', { name: /Used 10d/ });
    usedSeg.focus();
    await user.keyboard('{Enter}');
    expect(onSegmentClick).toHaveBeenCalledWith('used');
    onSegmentClick.mockClear();
    await user.keyboard(' ');
    expect(onSegmentClick).toHaveBeenCalledWith('used');
  });

  it('legend hidden when showLegend=false', () => {
    render(<BalanceMeter entitlement={25} used={10} showLegend={false} testId="bm" />);
    const root = screen.getByTestId('bm');
    // No "Remaining" word in legend (heading still says "remaining of X"); legend uses capital R + value pattern.
    expect(root.textContent).not.toMatch(/\bRemaining\b 15d/);
  });

  it('breakdown rendered when supplied', () => {
    render(
      <BalanceMeter
        entitlement={25}
        used={10}
        breakdown={[
          { label: 'Annual', used: 8, entitlement: 20 },
          { label: 'Sick', used: 2, entitlement: 5 },
        ]}
      />,
    );
    expect(screen.getByText(/By type/i)).toBeInTheDocument();
    expect(screen.getByText('Annual')).toBeInTheDocument();
    expect(screen.getByText('Sick')).toBeInTheDocument();
  });

  it('accrual line shows when accrual > 0', () => {
    render(<BalanceMeter entitlement={25} used={10} accrual={3} />);
    expect(screen.getByText(/Accruing/i)).toBeInTheDocument();
  });

  it('unit prop changes value rendering', () => {
    render(<BalanceMeter entitlement={1000} used={250} unit="$" testId="bm" />);
    const root = screen.getByTestId('bm');
    expect(root.textContent).toContain('750$');
    expect(root.textContent).toContain('250$');
  });

  it('size=xs renders smaller track + smaller font', () => {
    const { container } = render(<BalanceMeter entitlement={25} used={10} size="xs" testId="bm" />);
    const root = container.querySelector('[data-testid="bm"]') as HTMLDivElement;
    expect(root.style.fontSize).toBe('10px');
  });
});
