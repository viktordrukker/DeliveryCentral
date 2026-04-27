import { useEffect, useMemo, useState } from 'react';

import {
  AssignmentDirectoryItem,
  AssignmentDirectoryResponse,
  fetchAssignments,
} from '@/lib/api/assignments';
import { QueryState } from '@/lib/api/query-state';

export interface AssignmentFilters {
  from: string;
  person: string;
  personId?: string;
  project: string;
  status: string;
  to: string;
  // FE-04: optional pagination. The backend already accepts page/pageSize and
  // returns totalCount. Callers that omit them get the full result set.
  page?: number;
  pageSize?: number;
}

interface AssignmentsState extends QueryState<AssignmentDirectoryResponse> {
  totalCount: number;
  visibleItems: AssignmentDirectoryItem[];
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 50;

export function useAssignments(filters: AssignmentFilters): AssignmentsState {
  const [state, setState] = useState<QueryState<AssignmentDirectoryResponse>>({
    isLoading: true,
  });

  useEffect(() => {
    let active = true;

    setState({ isLoading: true });
    void fetchAssignments({
      from: filters.from || undefined,
      personId: filters.personId || undefined,
      status: filters.status || undefined,
      to: filters.to || undefined,
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
          error: error instanceof Error ? error.message : 'Failed to load assignments.',
          isLoading: false,
        });
      });

    return () => {
      active = false;
    };
  }, [filters.from, filters.personId, filters.status, filters.to, filters.page, filters.pageSize]);

  const visibleItems = useMemo(() => {
    const items = state.data?.items ?? [];
    const personSearch = filters.person.trim().toLowerCase();
    const projectSearch = filters.project.trim().toLowerCase();

    return items.filter((item) => {
      const matchesPerson =
        !personSearch || item.person.displayName.toLowerCase().includes(personSearch);
      const matchesProject =
        !projectSearch || item.project.displayName.toLowerCase().includes(projectSearch);

      return matchesPerson && matchesProject;
    });
  }, [filters.person, filters.project, state.data?.items]);

  return {
    ...state,
    totalCount: state.data?.totalCount ?? 0,
    visibleItems,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
  };
}
