import { useEffect, useMemo, useState } from 'react';

import {
  ProjectDirectoryItem,
  ProjectDirectoryResponse,
  fetchProjectDirectory,
} from '@/lib/api/project-registry';
import { QueryState } from '@/lib/api/query-state';

export interface ProjectRegistryFilters {
  search: string;
  source?: string;
  // FE-04: pagination is opt-in. Callers that omit page/pageSize get the full
  // dataset and can keep filtering client-side; callers that pass them get a
  // server-paginated slice.
  page?: number;
  pageSize?: number;
}

interface ProjectRegistryState extends QueryState<ProjectDirectoryResponse> {
  visibleItems: ProjectDirectoryItem[];
  totalCount: number;
}

export function useProjectRegistry(
  filters: ProjectRegistryFilters,
): ProjectRegistryState {
  const [state, setState] = useState<QueryState<ProjectDirectoryResponse>>({
    isLoading: true,
  });

  useEffect(() => {
    let active = true;

    setState({ isLoading: true });
    void fetchProjectDirectory({
      source: filters.source,
      page: filters.page,
      pageSize: filters.pageSize,
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
          error: error instanceof Error ? error.message : 'Failed to load project registry.',
          isLoading: false,
        });
      });

    return () => {
      active = false;
    };
  }, [filters.source, filters.page, filters.pageSize]);

  const visibleItems = useMemo(() => {
    const items = state.data?.items ?? [];
    const search = filters.search.trim().toLowerCase();

    if (!search) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.projectCode, item.status]
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }, [filters.search, state.data?.items]);

  return {
    ...state,
    visibleItems,
    totalCount: state.data?.totalCount ?? state.data?.items.length ?? 0,
  };
}
