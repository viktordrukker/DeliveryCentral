import { useEffect, useState } from 'react';

import { fetchManagerScope, ManagerScopeResponse } from '@/lib/api/manager-scope';
import { fetchPersonDirectoryById, PersonDirectoryItem } from '@/lib/api/person-directory';
import { ApiError } from '@/lib/api/http-client';

interface ManagerScopeState {
  data?: ManagerScopeResponse;
  error?: string;
  isLoading: boolean;
  manager?: PersonDirectoryItem;
  managerNotFound: boolean;
}

export function useManagerScope(managerId: string | undefined): ManagerScopeState {
  const [data, setData] = useState<ManagerScopeResponse>();
  const [manager, setManager] = useState<PersonDirectoryItem>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [managerNotFound, setManagerNotFound] = useState(false);

  useEffect(() => {
    if (!managerId) {
      setIsLoading(false);
      setManagerNotFound(true);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(undefined);
    setManagerNotFound(false);

    void Promise.all([
      fetchManagerScope(managerId, { page: 1, pageSize: 25 }),
      fetchPersonDirectoryById(managerId),
    ])
      .then(([scopeResponse, managerResponse]) => {
        if (!active) {
          return;
        }

        setData(scopeResponse);
        setManager(managerResponse);
        setIsLoading(false);
      })
      .catch((loadError: unknown) => {
        if (!active) {
          return;
        }

        if (loadError instanceof ApiError && loadError.status === 404) {
          setManagerNotFound(true);
        } else {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load manager scope.');
        }

        setData(undefined);
        setManager(undefined);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [managerId]);

  return {
    data,
    error,
    isLoading,
    manager,
    managerNotFound,
  };
}
