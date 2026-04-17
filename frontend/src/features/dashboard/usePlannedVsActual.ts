import { useCallback, useEffect, useState } from 'react';

import { QueryState } from '@/lib/api/query-state';
import { fetchPlannedVsActual, PlannedVsActualResponse } from '@/lib/api/planned-vs-actual';

export interface PlannedVsActualFilters {
  asOf: string;
  personId: string;
  projectId: string;
  weeks: number;
}

export function usePlannedVsActual(
  filters: PlannedVsActualFilters,
): QueryState<PlannedVsActualResponse> & { refetch: () => void } {
  const [state, setState] = useState<QueryState<PlannedVsActualResponse>>({
    isLoading: true,
  });
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;

    setState({ isLoading: true });
    void fetchPlannedVsActual({
      asOf: filters.asOf,
      weeks: filters.weeks,
      ...(filters.personId ? { personId: filters.personId } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
    })
      .then((data) => {
        if (!active) return;
        setState({ data, isLoading: false });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          error: error instanceof Error ? error.message : 'Failed to load planned vs actual comparison.',
          isLoading: false,
        });
      });

    return () => { active = false; };
  }, [filters.asOf, filters.personId, filters.projectId, filters.weeks, tick]);

  return { ...state, refetch };
}
