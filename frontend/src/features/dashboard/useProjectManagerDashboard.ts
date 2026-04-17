import { fetchProjectManagerDashboard, ProjectManagerDashboardResponse } from '@/lib/api/dashboard-project-manager';
import { useDashboardQuery, DashboardQueryState } from './useDashboardQuery';

type ProjectManagerDashboardState = DashboardQueryState<ProjectManagerDashboardResponse>;

export function useProjectManagerDashboard(
  initialPersonId?: string | null,
): ProjectManagerDashboardState {
  return useDashboardQuery({
    fetchFn: fetchProjectManagerDashboard,
    directoryRole: 'project_manager',
    errorMessage: 'Failed to load project manager dashboard.',
    initialPersonId,
  });
}
