import { fetchHrManagerDashboard, HrManagerDashboardResponse } from '@/lib/api/dashboard-hr-manager';
import { useDashboardQuery, DashboardQueryState } from './useDashboardQuery';

type HrManagerDashboardState = DashboardQueryState<HrManagerDashboardResponse>;

export function useHrManagerDashboard(
  initialPersonId?: string | null,
): HrManagerDashboardState {
  return useDashboardQuery({
    fetchFn: fetchHrManagerDashboard,
    directoryRole: 'hr_manager',
    errorMessage: 'Failed to load HR dashboard.',
    initialPersonId,
  });
}
