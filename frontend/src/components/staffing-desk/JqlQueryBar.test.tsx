/**
 * JqlQueryBar — autocomplete dropdown behaviour.
 *
 * Regression for F-JQL-DROPDOWN: the bar auto-focuses its input when it becomes
 * visible; that programmatic focus must NOT pop the suggestions dropdown open on
 * render (it used to show the full field list on first paint). A real user focus
 * or typing still opens it.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JqlQueryBar } from './JqlQueryBar';

describe('JqlQueryBar', () => {
  it('does not open the suggestions dropdown on render (programmatic auto-focus)', () => {
    vi.useFakeTimers();
    try {
      render(<JqlQueryBar filters={{}} onApplyFilters={() => {}} visible />);
      // Run the 50ms auto-focus timer — this triggers the input's onFocus.
      act(() => {
        vi.advanceTimersByTime(60);
      });
      // The field list must NOT be visible just because the bar auto-focused.
      expect(screen.queryByText('person')).toBeNull();
      expect(screen.queryByText('status')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens filtered field suggestions when the user types', async () => {
    render(<JqlQueryBar filters={{}} onApplyFilters={() => {}} visible />);
    const input = screen.getByPlaceholderText(/person ~/);
    fireEvent.change(input, { target: { value: 'st' } });
    // 'st' → fields starting with 'st': status, startDate.
    expect(await screen.findByText('status')).toBeInTheDocument();
    expect(screen.getByText('startDate')).toBeInTheDocument();
  });
});
