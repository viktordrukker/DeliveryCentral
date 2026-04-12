import { useEffect, useMemo, useState } from 'react';

import {
  PersonDirectoryItem,
  PersonDirectoryResponse,
  fetchPersonDirectory,
} from '@/lib/api/person-directory';
import { QueryState } from '@/lib/api/query-state';

export interface EmployeeDirectoryFilters {
  departmentId?: string;
  lifecycleStatus?: string;
  page: number;
  pageSize: number;
  resourcePoolId?: string;
  search: string;
}

interface EmployeeDirectoryState extends QueryState<PersonDirectoryResponse> {
  visibleItems: PersonDirectoryItem[];
}

export function useEmployeeDirectory(
  filters: EmployeeDirectoryFilters,
): EmployeeDirectoryState {
  const [state, setState] = useState<QueryState<PersonDirectoryResponse>>({
    isLoading: true,
  });

  useEffect(() => {
    let active = true;

    setState({ isLoading: true });
    void fetchPersonDirectory({
      departmentId: filters.departmentId,
      page: filters.page,
      pageSize: filters.pageSize,
      resourcePoolId: filters.resourcePoolId,
    })
      .then((data) => {
        if (!active) {
          return;
        }

        setState({
          data,
          isLoading: false,
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setState({
          error: error instanceof Error ? error.message : 'Failed to load employee directory.',
          isLoading: false,
        });
      });

    return () => {
      active = false;
    };
  }, [filters.departmentId, filters.page, filters.pageSize, filters.resourcePoolId]);

  const visibleItems = useMemo(() => {
    let items = state.data?.items ?? [];
    const search = filters.search.trim().toLowerCase();
    const statusFilter = filters.lifecycleStatus ?? 'ACTIVE';

    if (statusFilter !== 'ALL') {
      items = items.filter((item) => item.lifecycleStatus === statusFilter);
    }

    if (!search) {
      return items;
    }

    return items.filter((item) => {
      const manager = item.currentLineManager?.displayName ?? '';
      const orgUnit = item.currentOrgUnit?.name ?? '';
      return [item.displayName, orgUnit, manager, item.primaryEmail ?? '']
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [filters.lifecycleStatus, filters.search, state.data?.items]);

  return {
    ...state,
    visibleItems,
  };
}
