import { useEffect, useState } from 'react';

import { CaseRecord, fetchCaseById } from '@/lib/api/cases';
import { ApiError } from '@/lib/api/http-client';
import { QueryState } from '@/lib/api/query-state';

interface CaseDetailsState extends QueryState<CaseRecord> {
  notFound: boolean;
}

export function useCaseDetails(id?: string): CaseDetailsState {
  const [state, setState] = useState<CaseDetailsState>({
    isLoading: true,
    notFound: false,
  });

  useEffect(() => {
    let active = true;

    if (!id) {
      setState({
        error: 'Case id is required.',
        isLoading: false,
        notFound: false,
      });
      return;
    }

    setState({
      isLoading: true,
      notFound: false,
    });

    void fetchCaseById(id)
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
          error: error instanceof Error ? error.message : 'Failed to load case details.',
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
