import {
  DirectorDashboardResponse,
  fetchDirectorDashboard,
} from '@/lib/api/dashboard-director';
import { useGlobalDashboardQuery, GlobalDashboardQueryState } from './useGlobalDashboardQuery';

type DirectorDashboardState = GlobalDashboardQueryState<DirectorDashboardResponse>;

export function useDirectorDashboard(): DirectorDashboardState {
  return useGlobalDashboardQuery({
    fetchFn: fetchDirectorDashboard,
    errorMessage: 'Failed to load director dashboard.',
  });
}
