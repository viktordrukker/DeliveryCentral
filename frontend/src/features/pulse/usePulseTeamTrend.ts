import { useEffect, useState } from 'react';

import {
  fetchPulseTeamTrend,
  type PulseTeamTrendDto,
} from '@/lib/api/pulse';

export interface PulseTeamTrendState {
  data: PulseTeamTrendDto | null;
  isLoading: boolean;
  error: string | null;
}

// HD-7 — pulse team-trend tile. Resolves the caller's reporting scope on
// the server side and returns a weekly avgMood / responseCount /
// strugglingCount series. Empty weeks come back with avgMood=null so the
// caller can render gaps in the sparkline.
export function usePulseTeamTrend(weeks = 4): PulseTeamTrendState {
  const [data, setData] = useState<PulseTeamTrendDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    fetchPulseTeamTrend(weeks)
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load pulse trend.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [weeks]);

  return { data, isLoading, error };
}
