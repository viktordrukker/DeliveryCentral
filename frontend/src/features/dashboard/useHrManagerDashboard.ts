import { useEffect, useMemo, useState } from 'react';

import {
  HrManagerDashboardResponse,
  fetchHrManagerDashboard,
} from '@/lib/api/dashboard-hr-manager';
import { fetchPersonDirectory } from '@/lib/api/person-directory';

interface HrManagerDashboardState {
  asOf: string;
  data: HrManagerDashboardResponse | null;
  error: string | null;
  isLoading: boolean;
  people: Array<{ displayName: string; id: string }>;
  personId: string;
  setAsOf: (value: string) => void;
  setPersonId: (value: string) => void;
}

export function useHrManagerDashboard(
  initialPersonId?: string | null,
): HrManagerDashboardState {
  const [personId, setPersonId] = useState(initialPersonId ?? '');
  const [asOf, setAsOf] = useState(() => new Date().toISOString());
  const [data, setData] = useState<HrManagerDashboardResponse | null>(null);
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

    if (!personId) {
      setIsLoading(true);
      void fetchPersonDirectory({ page: 1, pageSize: 100, role: 'hr_manager' })
        .then((dir) => {
          if (!active) return;
          const items = dir.items.map((item) => ({ displayName: item.displayName, id: item.id }));
          setPeople(items);
          if (items.length > 0) {
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
      fetchPersonDirectory({ page: 1, pageSize: 100, role: 'hr_manager' }),
      fetchHrManagerDashboard(personId, asOf),
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
          reason instanceof Error ? reason.message : 'Failed to load HR dashboard.',
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
