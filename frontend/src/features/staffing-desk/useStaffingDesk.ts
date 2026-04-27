import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchStaffingDesk,
  type StaffingDeskQuery,
  type StaffingDeskResponse,
  type StaffingDeskRow,
  type StaffingDeskKpis,
  type SupplyDemandMetrics,
} from '@/lib/api/staffing-desk';

const EMPTY_KPIS: StaffingDeskKpis = { activeAssignments: 0, openRequests: 0, avgAllocationPercent: 0, overallocatedPeople: 0 };
const EMPTY_SD: SupplyDemandMetrics = { totalPeople: 0, availableFte: 0, benchCount: 0, totalHeadcountRequired: 0, headcountFulfilled: 0, headcountOpen: 0, gapHc: 0, fillRatePercent: 100, avgDaysToFulfil: 0 };

export interface UseStaffingDeskState {
  items: StaffingDeskRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  kpis: StaffingDeskKpis;
  supplyDemand: SupplyDemandMetrics;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStaffingDesk(query: StaffingDeskQuery): UseStaffingDeskState {
  const [data, setData] = useState<StaffingDeskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  // QUAL-07: serialize the query into a stable string so the effect re-runs on
  // *content* change rather than on every parent re-render that happens to
  // produce a fresh `query` object reference. The latest `query` is read via a
  // ref so the effect's dependency list stays honest: only the serialized key
  // and the manual refetch counter trigger a refetch. No eslint-disable needed.
  const queryKey = JSON.stringify(query);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    void fetchStaffingDesk(queryRef.current)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load staffing desk data.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [queryKey, fetchKey]);

  return {
    items: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 50,
    kpis: data?.kpis ?? EMPTY_KPIS,
    supplyDemand: data?.supplyDemand ?? EMPTY_SD,
    isLoading,
    error,
    refetch,
  };
}
