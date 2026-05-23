import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Calendar } from './Calendar';

// Fixed anchor so the test doesn't drift with the system clock.
const TODAY = new Date(2026, 4, 23); // 23 May 2026
const MONTH = new Date(2026, 4, 1);

describe('Calendar', () => {
  it('renders the picker mode month header', () => {
    render(<Calendar today={TODAY} month={MONTH} testId="cal" />);
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
  });

  it('renders 7 weekday column headers', () => {
    render(<Calendar today={TODAY} month={MONTH} testId="cal" />);
    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders).toHaveLength(7);
  });

  it('weekStartsOn=0 puts Sunday first; weekStartsOn=1 puts Monday first', () => {
    const { rerender } = render(<Calendar today={TODAY} month={MONTH} weekStartsOn={0} />);
    const headers0 = screen.getAllByRole('columnheader').map((el) => el.textContent);
    expect(headers0[0]).toBe('S');
    rerender(<Calendar today={TODAY} month={MONTH} weekStartsOn={1} />);
    const headers1 = screen.getAllByRole('columnheader').map((el) => el.textContent);
    expect(headers1[0]).toBe('M');
  });

  it('previous-month button advances the displayed month backward', async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(<Calendar today={TODAY} month={MONTH} onMonthChange={onMonthChange} />);
    await user.click(screen.getByRole('button', { name: /Previous month/i }));
    expect(onMonthChange).toHaveBeenCalledTimes(1);
    const arg = onMonthChange.mock.calls[0][0] as Date;
    expect(arg.getMonth()).toBe(3); // April
  });

  it('next-month button advances the displayed month forward', async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(<Calendar today={TODAY} month={MONTH} onMonthChange={onMonthChange} />);
    await user.click(screen.getByRole('button', { name: /Next month/i }));
    expect(onMonthChange).toHaveBeenCalledTimes(1);
    const arg = onMonthChange.mock.calls[0][0] as Date;
    expect(arg.getMonth()).toBe(5); // June
  });

  it('clicking a day fires onChange with that date', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Calendar today={TODAY} month={MONTH} onChange={onChange} />);
    const cell = screen.getByRole('gridcell', { name: /5\/15\/2026/ });
    await user.click(cell);
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getFullYear()).toBe(2026);
    expect(arg.getMonth()).toBe(4);
    expect(arg.getDate()).toBe(15);
  });

  it('today cell carries a today-marker data attribute', () => {
    render(<Calendar today={TODAY} month={MONTH} />);
    const todayCell = document.querySelector('[data-today="true"]') as HTMLButtonElement | null;
    expect(todayCell).not.toBeNull();
    expect(todayCell?.textContent).toBe('23');
  });

  it('selected value cell has aria-selected=true and a data-selected attribute', () => {
    const selected = new Date(2026, 4, 10);
    render(<Calendar today={TODAY} month={MONTH} value={selected} />);
    const cell = screen.getByRole('gridcell', { name: /5\/10\/2026/ });
    expect(cell).toHaveAttribute('aria-selected', 'true');
    expect(cell).toHaveAttribute('data-selected');
  });

  it('event of kind=holiday adds it to the cell aria-label', () => {
    const events = [{ date: new Date(2026, 4, 27), kind: 'holiday' as const }];
    render(<Calendar today={TODAY} month={MONTH} events={events} />);
    const cell = screen.getByRole('gridcell', { name: /5\/27\/2026.*holiday/i });
    expect(cell).toBeInTheDocument();
  });

  it('range mode: two clicks set start and end via onRangeChange', async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    const Wrapper = (): JSX.Element => {
      const [rs, setRs] = (require('react') as typeof import('react')).useState<Date | null>(null);
      const [re, setRe] = (require('react') as typeof import('react')).useState<Date | null>(null);
      return (
        <Calendar
          today={TODAY}
          month={MONTH}
          range
          rangeStart={rs}
          rangeEnd={re}
          onRangeChange={(s, e) => {
            setRs(s);
            setRe(e);
            onRangeChange(s, e);
          }}
        />
      );
    };
    render(<Wrapper />);
    await user.click(screen.getByRole('gridcell', { name: /5\/5\/2026/ }));
    await user.click(screen.getByRole('gridcell', { name: /5\/12\/2026/ }));
    expect(onRangeChange).toHaveBeenCalledTimes(2);
    const lastCall = onRangeChange.mock.calls[1];
    const start = lastCall[0] as Date;
    const end = lastCall[1] as Date;
    expect(start.getDate()).toBe(5);
    expect(end.getDate()).toBe(12);
  });

  it('range mode normalizes when end < start (sorts ascending)', async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    const Wrapper = (): JSX.Element => {
      const [rs, setRs] = (require('react') as typeof import('react')).useState<Date | null>(null);
      const [re, setRe] = (require('react') as typeof import('react')).useState<Date | null>(null);
      return (
        <Calendar
          today={TODAY}
          month={MONTH}
          range
          rangeStart={rs}
          rangeEnd={re}
          onRangeChange={(s, e) => {
            setRs(s);
            setRe(e);
            onRangeChange(s, e);
          }}
        />
      );
    };
    render(<Wrapper />);
    await user.click(screen.getByRole('gridcell', { name: /5\/15\/2026/ }));
    await user.click(screen.getByRole('gridcell', { name: /5\/8\/2026/ }));
    const finalCall = onRangeChange.mock.calls[1];
    const start = finalCall[0] as Date;
    const end = finalCall[1] as Date;
    expect(start.getDate()).toBe(8);
    expect(end.getDate()).toBe(15);
  });

  it('year mode renders 12 month grids', () => {
    render(<Calendar today={TODAY} month={MONTH} mode="year" />);
    // Each CalendarMonthView renders its own role="grid"; 12 months → 12 grids.
    const grids = screen.getAllByRole('grid');
    expect(grids).toHaveLength(12);
  });

  it('keyboard ArrowRight moves focus +1 day', () => {
    render(<Calendar today={TODAY} month={MONTH} />);
    const today = document.querySelector('[data-today="true"]') as HTMLButtonElement;
    today.focus();
    // ArrowRight on the wrapping onKeyDown div catches the event via bubbling.
    fireEvent.keyDown(today, { key: 'ArrowRight' });
    // Focus stays on the same DOM button (roving-tabindex updates which element
    // is tabIndex=0 on next render). What we assert is that the focusedDate
    // moved — check by looking at which cell now has tabIndex=0.
    const focusedCell = document.querySelector('[role="gridcell"][tabindex="0"]') as HTMLButtonElement;
    expect(focusedCell.textContent).toBe('24');
  });

  it('keyboard ArrowDown moves focus +7 days', () => {
    render(<Calendar today={TODAY} month={MONTH} />);
    const today = document.querySelector('[data-today="true"]') as HTMLButtonElement;
    today.focus();
    fireEvent.keyDown(today, { key: 'ArrowDown' });
    const focusedCell = document.querySelector('[role="gridcell"][tabindex="0"]') as HTMLButtonElement;
    expect(focusedCell.textContent).toBe('30');
  });

  it('keyboard PageDown moves to the next month and updates displayed month', () => {
    const onMonthChange = vi.fn();
    render(<Calendar today={TODAY} month={MONTH} onMonthChange={onMonthChange} />);
    const today = document.querySelector('[data-today="true"]') as HTMLButtonElement;
    today.focus();
    fireEvent.keyDown(today, { key: 'PageDown' });
    expect(onMonthChange).toHaveBeenCalled();
    const arg = onMonthChange.mock.calls[onMonthChange.mock.calls.length - 1][0] as Date;
    expect(arg.getMonth()).toBe(5); // June
  });

  it('keyboard Enter selects the focused day', () => {
    const onChange = vi.fn();
    render(<Calendar today={TODAY} month={MONTH} onChange={onChange} />);
    const today = document.querySelector('[data-today="true"]') as HTMLButtonElement;
    today.focus();
    fireEvent.keyDown(today, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getDate()).toBe(23);
  });

  it('empty events list does not crash', () => {
    expect(() => render(<Calendar today={TODAY} month={MONTH} events={[]} />)).not.toThrow();
  });
});
