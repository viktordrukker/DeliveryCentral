import { useEffect, useState } from 'react';

import { QueryState } from '@/lib/api/query-state';
import { fetchPlannedVsActual, PlannedVsActualResponse } from '@/lib/api/planned-vs-actual';

export interface PlannedVsActualFilters {
  asOf: string;
  personId: string;
  projectId: string;
}

export function usePlannedVsActual(
  filters: PlannedVsActualFilters,
): QueryState<PlannedVsActualResponse> {
  const [state, setState] = useState<QueryState<PlannedVsActualResponse>>({
    isLoading: true,
  });

  useEffect(() => {
    let active = true;

    setState({ isLoading: true });
    void fetchPlannedVsActual({
      asOf: filters.asOf,
      ...(filters.personId ? { personId: filters.personId } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
    })
      .then((data) => {
        if (!active) {
          return;
        }

        setState({ data, isLoading: false });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setState({
          error: error instanceof Error ? error.message : 'Failed to load planned vs actual comparison.',
          isLoading: false,
        });
      });

    return () => {
      active = false;
    };
  }, [filters.asOf, filters.personId, filters.projectId]);

  return state;
}
