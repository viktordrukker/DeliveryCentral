import { useEffect, useMemo, useState } from 'react';

import {
  DirectorDashboardResponse,
  fetchDirectorDashboard,
} from '@/lib/api/dashboard-director';

interface DirectorDashboardState {
  asOf: string;
  data: DirectorDashboardResponse | null;
  error: string | null;
  isLoading: boolean;
  setAsOf: (value: string) => void;
}

export function useDirectorDashboard(): DirectorDashboardState {
  const [asOf, setAsOf] = useState(() => new Date().toISOString());
  const [data, setData] = useState<DirectorDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    void fetchDirectorDashboard(asOf)
      .then((dashboard) => {
        if (!active) {
          return;
        }

        setData(dashboard);
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }

        setData(null);
        setError(
          reason instanceof Error ? reason.message : 'Failed to load director dashboard.',
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
  }, [asOf]);

  return useMemo(
    () => ({
      asOf,
      data,
      error,
      isLoading,
      setAsOf,
    }),
    [asOf, data, error, isLoading],
  );
}
