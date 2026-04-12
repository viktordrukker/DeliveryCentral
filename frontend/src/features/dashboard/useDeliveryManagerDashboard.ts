import { useEffect, useMemo, useState } from 'react';

import {
  DeliveryManagerDashboardResponse,
  fetchDeliveryManagerDashboard,
} from '@/lib/api/dashboard-delivery-manager';

interface DeliveryManagerDashboardState {
  asOf: string;
  data: DeliveryManagerDashboardResponse | null;
  error: string | null;
  isLoading: boolean;
  setAsOf: (value: string) => void;
}

export function useDeliveryManagerDashboard(): DeliveryManagerDashboardState {
  const [asOf, setAsOf] = useState(() => new Date().toISOString());
  const [data, setData] = useState<DeliveryManagerDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    void fetchDeliveryManagerDashboard(asOf)
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
          reason instanceof Error ? reason.message : 'Failed to load delivery manager dashboard.',
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
