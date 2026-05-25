import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Tabs, type TabItem, tabIds } from './Tabs';

const SAMPLE_TABS: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'time', label: 'Time' },
  { id: 'leave', label: 'Leave' },
];

function ControlledHarness({
  initial = 'overview',
  tabs = SAMPLE_TABS,
  onChange,
}: {
  initial?: string;
  tabs?: TabItem[];
  onChange?: (id: string) => void;
}): JSX.Element {
  const [value, setValue] = useState(initial);
  return (
    <Tabs
      tabs={tabs}
      value={value}
      onValueChange={(id) => {
        setValue(id);
        onChange?.(id);
      }}
      ariaLabel="Workspace tabs"
      idPrefix="harness"
    />
  );
}

describe('Tabs — V2-B.12', () => {
  it('renders one button per tab with the correct ARIA semantics', () => {
    render(<ControlledHarness />);
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'Workspace tabs');
    expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
  });

  it('applies roving tabindex (selected = 0, others = -1)', () => {
    render(<ControlledHarness initial="time" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('tabindex', '-1');
    expect(tabs[1]).toHaveAttribute('tabindex', '0');
    expect(tabs[2]).toHaveAttribute('tabindex', '-1');
  });

  it('clicking a tab fires onValueChange', () => {
    const onChange = vi.fn();
    render(<ControlledHarness onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Leave' }));
    expect(onChange).toHaveBeenCalledWith('leave');
  });

  it('ArrowRight moves selection to the next tab', () => {
    const onChange = vi.fn();
    render(<ControlledHarness onChange={onChange} />);
    const tab = screen.getByRole('tab', { name: 'Overview' });
    fireEvent.keyDown(tab, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('time');
  });

  it('ArrowLeft wraps around to the last tab', () => {
    const onChange = vi.fn();
    render(<ControlledHarness onChange={onChange} />);
    const tab = screen.getByRole('tab', { name: 'Overview' });
    fireEvent.keyDown(tab, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('leave');
  });

  it('Home jumps to first tab, End jumps to last', () => {
    const onChange = vi.fn();
    render(<ControlledHarness initial="time" onChange={onChange} />);
    const tab = screen.getByRole('tab', { name: 'Time' });
    fireEvent.keyDown(tab, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('leave');
    fireEvent.keyDown(tab, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('overview');
  });

  it('skips disabled tabs during keyboard navigation', () => {
    const onChange = vi.fn();
    const tabs: TabItem[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B', disabled: true },
      { id: 'c', label: 'C' },
    ];
    render(<ControlledHarness tabs={tabs} initial="a" onChange={onChange} />);
    const tabA = screen.getByRole('tab', { name: 'A' });
    fireEvent.keyDown(tabA, { key: 'ArrowRight' });
    // Should skip disabled "B" and land on "C".
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('disabled tabs render with aria-disabled and do not fire onValueChange on click', () => {
    const onChange = vi.fn();
    const tabs: TabItem[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B', disabled: true },
    ];
    render(<ControlledHarness tabs={tabs} onChange={onChange} />);
    const tabB = screen.getByRole('tab', { name: 'B' });
    expect(tabB).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(tabB);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('tabIds helper produces stable tab + panel id pairs', () => {
    const ids = tabIds('me-tab', 'leave');
    expect(ids.tabId).toBe('me-tab-leave');
    expect(ids.panelId).toBe('me-tabpanel-leave');
  });

  it('vertical orientation uses ↑/↓ keys instead of ←/→', () => {
    const onChange = vi.fn();
    const VerticalHarness = (): JSX.Element => {
      const [value, setValue] = useState('overview');
      return (
        <Tabs
          tabs={SAMPLE_TABS}
          value={value}
          onValueChange={(id) => {
            setValue(id);
            onChange(id);
          }}
          orientation="vertical"
        />
      );
    };
    render(<VerticalHarness />);
    const tab = screen.getByRole('tab', { name: 'Overview' });
    fireEvent.keyDown(tab, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenCalledWith('time');
    // Horizontal arrow keys do nothing in vertical orientation.
    onChange.mockReset();
    fireEvent.keyDown(tab, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });
});
