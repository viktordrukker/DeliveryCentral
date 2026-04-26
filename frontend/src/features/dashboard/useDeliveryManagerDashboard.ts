import {
  DeliveryManagerDashboardResponse,
  fetchDeliveryManagerDashboard,
} from '@/lib/api/dashboard-delivery-manager';
import { useGlobalDashboardQuery, GlobalDashboardQueryState } from './useGlobalDashboardQuery';

type DeliveryManagerDashboardState = GlobalDashboardQueryState<DeliveryManagerDashboardResponse>;

export function useDeliveryManagerDashboard(): DeliveryManagerDashboardState {
  return useGlobalDashboardQuery({
    fetchFn: fetchDeliveryManagerDashboard,
    errorMessage: 'Failed to load delivery manager dashboard.',
  });
}
