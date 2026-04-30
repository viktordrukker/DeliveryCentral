import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { fetchPulseHistory, submitPulse, PulseEntryDto } from '@/lib/api/pulse';
import { Button } from '@/components/ds';

const MOOD_OPTIONS: Array<{
  value: number;
  emoji: string;
  label: string;
  color: string;
  bg: string;
}> = [
  { value: 1, emoji: '😣', label: 'Struggling', color: '#ef4444', bg: '#fee2e2' },
  { value: 2, emoji: '😟', label: 'Stressed', color: '#f97316', bg: '#ffedd5' },
  { value: 3, emoji: '😐', label: 'Neutral', color: '#eab308', bg: '#fef9c3' },
  { value: 4, emoji: '😊', label: 'Good', color: '#84cc16', bg: '#f0fdf4' },
  { value: 5, emoji: '😄', label: 'Great', color: '#22c55e', bg: '#dcfce7' },
];

function getMoodOption(mood: number) {
  return MOOD_OPTIONS.find((m) => m.value === mood);
}

/** Returns the ISO Monday date string for the current week */
function currentWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

interface PulseWidgetProps {
  className?: string;
}

export function PulseWidget({ className }: PulseWidgetProps): JSX.Element {
  const [history, setHistory] = useState<PulseEntryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const thisWeek = currentWeekStart();
  const thisWeekEntry = history.find((e) => e.weekStart === thisWeek);
  const alreadySubmitted = !!thisWeekEntry;

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchPulseHistory(4);
      setHistory(result.entries);
      const thisEntry = result.entries.find((e) => e.weekStart === thisWeek);
      if (thisEntry) {
        setSelected(thisEntry.mood);
        setNote(thisEntry.note ?? '');
      }
    } catch {
      // Silently handle — widget is non-critical
    } finally {
      setIsLoading(false);
    }
  }, [thisWeek]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function handleSubmit(): Promise<void> {
    if (selected === null || alreadySubmitted) return;

    setIsSubmitting(true);
    try {
      const entry = await submitPulse({ mood: selected, note: note.trim() || undefined });
      setHistory((prev) => {
        const filtered = prev.filter((e) => e.weekStart !== thisWeek);
        return [entry, ...filtered];
      });
      toast.success('Pulse submitted! See you next week.');
    } catch {
      toast.error('Failed to submit pulse. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Last 4 weeks excluding current week (for history dots)
  const historyWeeks = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - (i + 1) * 7);
    return d.toISOString().slice(0, 10);
  }).reverse();

  return (
    <div className={`pulse-widget${className ? ` ${className}` : ''}`} data-testid="pulse-widget">
      <div className="pulse-widget__title">How are you feeling this week?</div>

      {isLoading ? (
        <div className="pulse-widget__loading">Loading...</div>
      ) : (
        <>
          {alreadySubmitted ? null : (
            <div className="pulse-widget__moods" role="group" aria-label="Mood selection">
              {MOOD_OPTIONS.map((option) => {
                const isSelected = selected === option.value;
                return (
                  <Button
                    aria-label={`${option.label} (${option.value})`}
                    aria-pressed={isSelected}
                    variant="secondary"
                    className="pulse-widget__mood-btn"
                    key={option.value}
                    onClick={() => { setSelected(option.value); }}
                    style={{
                      background: isSelected ? option.bg : undefined,
                      borderColor: isSelected ? option.color : undefined,
                      outline: isSelected ? `2px solid ${option.color}` : undefined,
                    }}
                    type="button"
                  >
                    <span className="pulse-widget__mood-emoji" role="img" aria-hidden="true">
                      {option.emoji}
                    </span>
                    <span className="pulse-widget__mood-label">{option.label}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {!alreadySubmitted && selected !== null && (
            <>
              <Button
                variant="link"
                size="sm"
                className="pulse-widget__note-toggle"
                onClick={() => setShowNote((v) => !v)}
                type="button"
              >
                {showNote ? 'Hide note' : 'Add a note (optional)'}
              </Button>

              {showNote && (
                <textarea
                  aria-label="Pulse note"
                  className="pulse-widget__note"
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything you'd like to share..."
                  rows={3}
                  value={note}
                />
              )}

              <Button variant="primary" disabled={isSubmitting} onClick={() => { void handleSubmit(); }} type="button">
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </>
          )}

          {alreadySubmitted && thisWeekEntry && (
            <div
              className="pulse-widget__submitted"
              data-testid="pulse-submitted-badge"
              style={{ color: getMoodOption(thisWeekEntry.mood)?.color }}
            >
              Pulse submitted {getMoodOption(thisWeekEntry.mood)?.emoji} — see you next week
            </div>
          )}

          {/* History dots — last 4 weeks */}
          {historyWeeks.some((w) => history.find((e) => e.weekStart === w)) && (
            <div className="pulse-widget__history" data-testid="pulse-history">
              <div className="pulse-widget__history-label">Last 4 weeks</div>
              <div className="pulse-widget__history-dots">
                {historyWeeks.map((w) => {
                  const entry = history.find((e) => e.weekStart === w);
                  const moodOpt = entry ? getMoodOption(entry.mood) : null;
                  return (
                    <div
                      className="pulse-widget__history-dot-wrap"
                      key={w}
                      title={w}
                    >
                      {moodOpt ? (
                        <>
                          <div
                            aria-label={`${moodOpt.label} on ${w}`}
                            className="pulse-widget__history-dot"
                            data-testid={`history-dot-${w}`}
                            role="img"
                            style={{ background: moodOpt.color }}
                          />
                          <span className="pulse-widget__history-mood">{moodOpt.emoji}</span>
                        </>
                      ) : (
                        <div
                          className="pulse-widget__history-dot pulse-widget__history-dot--empty"
                          data-testid={`history-dot-${w}`}
                          style={{ background: '#e5e7eb' }}
                        />
                      )}
                      <span className="pulse-widget__history-week">
                        {w.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
