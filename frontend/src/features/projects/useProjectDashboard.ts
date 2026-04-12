import { useEffect, useMemo, useState } from 'react';

import {
  ComparisonAnomalyItem,
  PlannedVsActualResponse,
  fetchPlannedVsActual,
} from '@/lib/api/planned-vs-actual';
import { ProjectDetails, fetchProjectById } from '@/lib/api/project-registry';
import { WorkEvidenceItem, fetchWorkEvidence } from '@/lib/api/work-evidence';
import {
  ProjectDashboardResponse,
  fetchProjectDashboard,
} from '@/lib/api/project-dashboard';
import { ApiError } from '@/lib/api/http-client';

export interface ProjectDashboardData {
  anomalies: ComparisonAnomalyItem[];
  comparison: PlannedVsActualResponse;
  dashboard: ProjectDashboardResponse;
  project: ProjectDetails;
  workEvidence: WorkEvidenceItem[];
}

interface ProjectDashboardState {
  data?: ProjectDashboardData;
  error?: string;
  isLoading: boolean;
  notFound: boolean;
}

export function useProjectDashboard(id?: string): ProjectDashboardState {
  const [state, setState] = useState<ProjectDashboardState>({
    isLoading: true,
    notFound: false,
  });

  const requestKey = useMemo(() => id ?? '', [id]);

  useEffect(() => {
    let active = true;

    if (!id) {
      setState({
        error: 'Project id is required.',
        isLoading: false,
        notFound: false,
      });
      return;
    }

    setState({
      isLoading: true,
      notFound: false,
    });

    void Promise.all([
      fetchProjectById(id),
      fetchProjectDashboard(id),
      fetchWorkEvidence({ projectId: id }),
      fetchPlannedVsActual({ projectId: id }),
    ])
      .then(([project, dashboard, workEvidence, comparison]) => {
        if (!active) {
          return;
        }

        setState({
          data: {
            anomalies: comparison.anomalies,
            comparison,
            dashboard,
            project,
            workEvidence: workEvidence.items,
          },
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
            error instanceof Error ? error.message : 'Failed to load project dashboard.',
          isLoading: false,
          notFound: false,
        });
      });

    return () => {
      active = false;
    };
  }, [requestKey, id]);

  return state;
}
