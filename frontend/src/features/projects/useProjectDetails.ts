import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api/http-client';
import { QueryState } from '@/lib/api/query-state';
import { ProjectDetails, fetchProjectById } from '@/lib/api/project-registry';

interface ProjectDetailsState extends QueryState<ProjectDetails> {
  notFound: boolean;
  reload: () => Promise<void>;
}

export function useProjectDetails(id?: string): ProjectDetailsState {
  const [state, setState] = useState<QueryState<ProjectDetails> & { notFound: boolean }>({
    isLoading: true,
    notFound: false,
  });

  async function loadProject(targetId: string, activeRef?: { current: boolean }): Promise<void> {
    setState({
      isLoading: true,
      notFound: false,
    });

    try {
      const data = await fetchProjectById(targetId);

      if (activeRef && !activeRef.current) {
        return;
      }

      setState({
        data,
        isLoading: false,
        notFound: false,
      });
    } catch (error: unknown) {
      if (activeRef && !activeRef.current) {
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
        error: error instanceof Error ? error.message : 'Failed to load project details.',
        isLoading: false,
        notFound: false,
      });
    }
  }

  async function reload(): Promise<void> {
    if (!id) {
      return;
    }

    await loadProject(id);
  }

  useEffect(() => {
    const active = { current: true };

    if (!id) {
      setState({
        error: 'Project id is required.',
        isLoading: false,
        notFound: false,
      });
      return;
    }

    void loadProject(id, active);

    return () => {
      active.current = false;
    };
  }, [id]);

  return {
    ...state,
    reload,
  };
}
