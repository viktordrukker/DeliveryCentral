import { useEffect, useMemo, useState } from 'react';

import { fetchPersonDirectory } from '@/lib/api/person-directory';

export interface DashboardQueryState<T> {
  asOf: string;
  data: T | null;
  error: string | null;
  isLoading: boolean;
  people: Array<{ displayName: string; id: string }>;
  personId: string;
  setAsOf: (value: string) => void;
  setPersonId: (value: string) => void;
}

interface UseDashboardQueryOptions<T> {
  /** The API fetch function: (personId, asOf) => Promise<T> */
  fetchFn: (personId: string, asOf: string) => Promise<T>;
  /** Optional role filter for person directory dropdown */
  directoryRole?: string;
  /** Error message shown on fetch failure */
  errorMessage?: string;
  /** Initial person ID from auth context */
  initialPersonId?: string | null;
}

/**
 * Shared hook for all person-scoped dashboard pages.
 * Handles: person selector, asOf date, loading/error states, cleanup.
 */
export function useDashboardQuery<T>(
  options: UseDashboardQueryOptions<T>,
): DashboardQueryState<T> {
  const { fetchFn, directoryRole, errorMessage = 'Failed to load dashboard.', initialPersonId } = options;

  const [personId, setPersonId] = useState(initialPersonId ?? '');
  const [asOf, setAsOf] = useState(() => new Date().toISOString());
  const [data, setData] = useState<T | null>(null);
  const [people, setPeople] = useState<Array<{ displayName: string; id: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (initialPersonId !== undefined && initialPersonId !== null) {
      setPersonId(initialPersonId);
    }
  }, [initialPersonId]);

  useEffect(() => {
    let active = true;

    if (initialPersonId === null) return;

    const dirParams: { page: number; pageSize: number; role?: string } = { page: 1, pageSize: 100 };
    if (directoryRole) dirParams.role = directoryRole;

    if (!personId) {
      setIsLoading(true);
      void fetchPersonDirectory(dirParams)
        .then((dir) => {
          if (!active) return;
          const items = dir.items.map((item) => ({ displayName: item.displayName, id: item.id }));
          setPeople(items);
          if (items.length > 0 && initialPersonId !== undefined) {
            setPersonId(items[0].id);
          } else {
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (active) setIsLoading(false);
        });
      return () => { active = false; };
    }

    setIsLoading(true);
    setError(null);

    void Promise.all([
      fetchPersonDirectory(dirParams),
      fetchFn(personId, asOf),
    ])
      .then(([directory, dashboard]) => {
        if (!active) return;
        setPeople(directory.items.map((item) => ({ displayName: item.displayName, id: item.id })));
        setData(dashboard);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setData(null);
        setError(reason instanceof Error ? reason.message : errorMessage);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOf, personId]);

  return useMemo(
    () => ({ asOf, data, error, isLoading, people, personId, setAsOf, setPersonId }),
    [asOf, data, error, isLoading, people, personId],
  );
}
