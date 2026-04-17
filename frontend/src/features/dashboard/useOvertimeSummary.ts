import { useCallback, useEffect, useState } from 'react';

import { QueryState } from '@/lib/api/query-state';
import { fetchOvertimeSummary, OvertimeSummaryResponse } from '@/lib/api/overtime';

export interface OvertimeSummaryFilters {
  weeks: number;
  asOf?: string;
}

export function useOvertimeSummary(
  filters: OvertimeSummaryFilters,
): QueryState<OvertimeSummaryResponse> & { refetch: () => void } {
  const [state, setState] = useState<QueryState<OvertimeSummaryResponse>>({ isLoading: true });
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    setState({ isLoading: true });
    void fetchOvertimeSummary({ weeks: filters.weeks, asOf: filters.asOf })
      .then((data) => { if (active) setState({ data, isLoading: false }); })
      .catch((error: unknown) => {
        if (active) setState({ error: error instanceof Error ? error.message : 'Failed to load overtime summary.', isLoading: false });
      });
    return () => { active = false; };
  }, [filters.weeks, filters.asOf, tick]);

  return { ...state, refetch };
}
