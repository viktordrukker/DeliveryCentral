import { useCallback, useEffect, useRef, useState } from 'react';

import {
  TimesheetWeek,
  UpsertEntryInput,
  fetchMyTimesheetWeek,
  submitTimesheetWeek,
  upsertTimesheetEntry,
} from '@/lib/api/timesheets';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseTimesheetWeekResult {
  week: TimesheetWeek | null;
  isLoading: boolean;
  error: string | null;
  saveStatus: SaveStatus;
  saveEntry: (entry: UpsertEntryInput) => Promise<void>;
  submitWeek: () => Promise<void>;
  reload: () => void;
}

export function useTimesheetWeek(weekStart: string): UseTimesheetWeekResult {
  const [week, setWeek] = useState<TimesheetWeek | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [reloadToken, setReloadToken] = useState(0);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    fetchMyTimesheetWeek(weekStart)
      .then((data) => {
        if (active) {
          setWeek(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load timesheet.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [weekStart, reloadToken]);

  const saveEntry = useCallback(
    async (entry: UpsertEntryInput): Promise<void> => {
      setSaveStatus('saving');
      try {
        const saved = await upsertTimesheetEntry(entry);

        setWeek((prev) => {
          if (!prev) return prev;
          const existingIdx = prev.entries.findIndex(
            (e) => e.projectId === entry.projectId && e.date === entry.date,
          );
          const newEntries =
            existingIdx >= 0
              ? prev.entries.map((e, i) => (i === existingIdx ? saved : e))
              : [...prev.entries, saved];

          return { ...prev, entries: newEntries };
        });

        setSaveStatus('saved');

        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err: unknown) {
        setSaveStatus('error');
        throw err;
      }
    },
    [],
  );

  const submitWeek = useCallback(async (): Promise<void> => {
    const updated = await submitTimesheetWeek(weekStart);
    setWeek(updated);
  }, [weekStart]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  return { week, isLoading, error, saveStatus, saveEntry, submitWeek, reload };
}
