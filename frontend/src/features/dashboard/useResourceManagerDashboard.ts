import { fetchResourceManagerDashboard, ResourceManagerDashboardResponse } from '@/lib/api/dashboard-resource-manager';
import { useDashboardQuery, DashboardQueryState } from './useDashboardQuery';

type ResourceManagerDashboardState = DashboardQueryState<ResourceManagerDashboardResponse>;

export function useResourceManagerDashboard(
  initialPersonId?: string | null,
): ResourceManagerDashboardState {
  return useDashboardQuery({
    fetchFn: fetchResourceManagerDashboard,
    directoryRole: 'resource_manager',
    errorMessage: 'Failed to load resource manager dashboard.',
    initialPersonId,
  });
}
