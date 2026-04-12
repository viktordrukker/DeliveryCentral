import { useEffect, useMemo, useState } from 'react';

import {
  EmployeeDashboardResponse,
  fetchEmployeeDashboard,
} from '@/lib/api/dashboard-employee';
import { fetchPersonDirectory } from '@/lib/api/person-directory';

interface EmployeeDashboardState {
  asOf: string;
  data: EmployeeDashboardResponse | null;
  error: string | null;
  isLoading: boolean;
  personId: string;
  people: Array<{ displayName: string; id: string }>;
  setAsOf: (value: string) => void;
  setPersonId: (value: string) => void;
}

export function useEmployeeDashboard(initialPersonId?: string): EmployeeDashboardState {
  const [personId, setPersonId] = useState(initialPersonId ?? '');
  const [asOf, setAsOf] = useState(() => new Date().toISOString());
  const [data, setData] = useState<EmployeeDashboardResponse | null>(null);
  const [people, setPeople] = useState<Array<{ displayName: string; id: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (initialPersonId !== undefined) {
      setPersonId(initialPersonId);
    }
  }, [initialPersonId]);

  useEffect(() => {
    let active = true;

    if (!personId) {
      setIsLoading(true);
      void fetchPersonDirectory({ page: 1, pageSize: 100 })
        .then((dir) => {
          if (!active) return;
          const items = dir.items.map((item) => ({ displayName: item.displayName, id: item.id }));
          setPeople(items);
          // Only auto-select first person if an initialPersonId was provided (but empty/loading);
          // when initialPersonId is undefined (e.g. admin with no personId), let them choose.
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
      fetchPersonDirectory({ page: 1, pageSize: 100 }),
      fetchEmployeeDashboard(personId, asOf),
    ])
      .then(([directory, dashboard]) => {
        if (!active) {
          return;
        }

        setPeople(
          directory.items.map((item) => ({
            displayName: item.displayName,
            id: item.id,
          })),
        );
        setData(dashboard);
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }

        setData(null);
        setError(
          reason instanceof Error ? reason.message : 'Failed to load employee dashboard.',
        );
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [asOf, personId]);

  return useMemo(
    () => ({
      asOf,
      data,
      error,
      isLoading,
      people,
      personId,
      setAsOf,
      setPersonId,
    }),
    [asOf, data, error, isLoading, people, personId],
  );
}
