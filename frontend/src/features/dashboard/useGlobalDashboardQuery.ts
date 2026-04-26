import { useEffect, useMemo, useState } from 'react';

export interface GlobalDashboardQueryState<T> {
  asOf: string;
  data: T | null;
  error: string | null;
  isLoading: boolean;
  setAsOf: (value: string) => void;
}

interface UseGlobalDashboardQueryOptions<T> {
  fetchFn: (asOf: string) => Promise<T>;
  errorMessage?: string;
}

/**
 * Shared hook for tenant-global dashboards (no person selector).
 * Complements `useDashboardQuery` which is person-scoped.
 */
export function useGlobalDashboardQuery<T>(
  options: UseGlobalDashboardQueryOptions<T>,
): GlobalDashboardQueryState<T> {
  const { fetchFn, errorMessage = 'Failed to load dashboard.' } = options;

  const [asOf, setAsOf] = useState(() => new Date().toISOString());
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    void fetchFn(asOf)
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setData(null);
        setError(reason instanceof Error ? reason.message : errorMessage);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOf]);

  return useMemo(
    () => ({ asOf, data, error, isLoading, setAsOf }),
    [asOf, data, error, isLoading],
  );
}
