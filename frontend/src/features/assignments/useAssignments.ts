import { useEffect, useMemo, useState } from 'react';

import {
  AssignmentDirectoryItem,
  AssignmentDirectoryResponse,
} from '@/lib/api/assignments';
import { listProjectPositions, type PositionFillStatus } from '@/lib/api/project-positions';
import { QueryState } from '@/lib/api/query-state';
import {
  mapAssignmentStatusToFillStatus,
  mapListResponseToDirectory,
} from '@/features/lean-migration/position-to-assignment-mapper';

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
    // LEAN-P2-2: read from /project-positions and map back to the legacy
    // AssignmentDirectoryResponse shape. Status filter is translated through
    // the FE enum bridge — see position-to-assignment-mapper.
    const fillStatuses: PositionFillStatus[] | undefined = filters.status
      ? [mapAssignmentStatusToFillStatus(filters.status as never)]
      : undefined;
    const pageSize = filters.pageSize;
    const page = filters.page;
    const take = pageSize;
    const skip = page && pageSize ? (page - 1) * pageSize : undefined;
    void listProjectPositions({
      activePersonId: filters.personId || undefined,
      fillStatuses,
      skip,
      take,
    })
      .then((response): AssignmentDirectoryResponse => mapListResponseToDirectory(response))
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
