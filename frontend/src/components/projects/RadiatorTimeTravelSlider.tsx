import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ds';

interface RadiatorTimeTravelSliderProps {
  /** Weeks available in history, ascending oldest → newest. */
  historyWeeks: string[];
  /** Selected week string (ISO date) or 'current'. */
  selectedWeek: string | 'current';
  onChange: (week: string | 'current') => void;
}

const DEBOUNCE_MS = 200;

export function RadiatorTimeTravelSlider({
  historyWeeks,
  selectedWeek,
  onChange,
}: RadiatorTimeTravelSliderProps): JSX.Element {
  // Slider positions: 0..historyWeeks.length, where historyWeeks.length == 'current'
  const max = historyWeeks.length;
  const currentIdx = selectedWeek === 'current'
    ? max
    : Math.max(0, historyWeeks.indexOf(selectedWeek));

  const [pendingIdx, setPendingIdx] = useState<number>(currentIdx);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPendingIdx(currentIdx);
  }, [currentIdx]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  function handleInput(value: number): void {
    setPendingIdx(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange(value >= max ? 'current' : historyWeeks[value] ?? 'current');
    }, DEBOUNCE_MS);
  }

  function handleReturnToCurrent(): void {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPendingIdx(max);
    onChange('current');
  }

  const displayedWeek = pendingIdx >= max
    ? 'Current'
    : `Week of ${historyWeeks[pendingIdx] ?? '—'}`;

  if (max === 0) {
    return (
      <div
        data-testid="radiator-time-travel-slider"
        style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: 'var(--space-2) 0' }}
      >
        No historical snapshots available.
      </div>
    );
  }

  return (
    <div
      data-testid="radiator-time-travel-slider"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) 0',
      }}
    >
      <input
        aria-label="Radiator history week selector"
        max={max}
        min={0}
        onChange={(e) => handleInput(Number(e.target.value))}
        step={1}
        style={{ flex: 1 }}
        type="range"
        value={pendingIdx}
      />
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 150, textAlign: 'right' }}>
        {displayedWeek}
      </span>
      {pendingIdx < max ? (
        <Button variant="secondary" size="sm" onClick={handleReturnToCurrent} type="button">
          Return to current
        </Button>
      ) : null}
    </div>
  );
}
