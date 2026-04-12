import { useEffect, useState } from 'react';

import {
  PersonDirectoryItem,
  fetchPersonDirectoryById,
} from '@/lib/api/person-directory';
import { ApiError } from '@/lib/api/http-client';
import { QueryState } from '@/lib/api/query-state';

interface EmployeeDetailsState extends QueryState<PersonDirectoryItem> {
  notFound: boolean;
}

export function useEmployeeDetails(id?: string): EmployeeDetailsState {
  const [state, setState] = useState<EmployeeDetailsState>({
    isLoading: true,
    notFound: false,
  });

  useEffect(() => {
    let active = true;

    if (!id) {
      setState({
        error: 'Employee id is required.',
        isLoading: false,
        notFound: false,
      });
      return;
    }

    setState({
      isLoading: true,
      notFound: false,
    });

    void fetchPersonDirectoryById(id)
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
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load employee details.',
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
