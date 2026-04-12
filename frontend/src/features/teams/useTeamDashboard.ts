import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api/http-client';
import { QueryState } from '@/lib/api/query-state';
import { TeamDashboardResponse, fetchTeamDashboard } from '@/lib/api/teams';

interface TeamDashboardState extends QueryState<TeamDashboardResponse> {
  notFound: boolean;
}

export function useTeamDashboard(id?: string): TeamDashboardState {
  const [state, setState] = useState<TeamDashboardState>({
    isLoading: true,
    notFound: false,
  });

  useEffect(() => {
    let active = true;

    if (!id) {
      setState({
        error: 'Team id is required.',
        isLoading: false,
        notFound: false,
      });
      return;
    }

    setState({
      isLoading: true,
      notFound: false,
    });

    void fetchTeamDashboard(id)
      .then((data) => {
        if (!active) {
          return;
        }

        setState({
          data,
          isLoading: false,
          notFound: false,
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setState({
            isLoading: false,
            notFound: true,
          });
          return;
        }

        setState({
          error: error instanceof Error ? error.message : 'Failed to load team dashboard.',
          isLoading: false,
          notFound: false,
        });
      });

    return () => {
      active = false;
    };
  }, [id]);

  return state;
}
