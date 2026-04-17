import { fetchEmployeeDashboard, EmployeeDashboardResponse } from '@/lib/api/dashboard-employee';
import { useDashboardQuery, DashboardQueryState } from './useDashboardQuery';

type EmployeeDashboardState = DashboardQueryState<EmployeeDashboardResponse>;

export function useEmployeeDashboard(initialPersonId?: string): EmployeeDashboardState {
  return useDashboardQuery({
    fetchFn: fetchEmployeeDashboard,
    errorMessage: 'Failed to load employee dashboard.',
    initialPersonId,
  });
}
