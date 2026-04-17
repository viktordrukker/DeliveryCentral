import { useCallback, useEffect, useState } from 'react';

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

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    void fetchStaffingDesk(query)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query.kind, query.person, query.personId, query.project, query.projectId,
    query.poolId, query.orgUnitId, query.status, query.priority,
    query.role, query.skills, query.from, query.to,
    query.allocMin, query.allocMax, query.sortBy, query.sortDir,
    query.page, query.pageSize, fetchKey,
  ]);

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
