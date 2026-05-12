import { httpGet } from './http-client';

export type PendingActionKind = 'STAFFING_REQUEST' | 'BUDGET_CHANGE' | 'LEAVE_REQUEST' | 'TIMESHEET';
export type PendingActionSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PendingActionItem {
  kind: PendingActionKind;
  id: string;
  publicId: string | null;
  title: string;
  contextLabel: string | null;
  ageHours: number;
  severity: PendingActionSeverity;
  ctaUrl: string;
}

export interface PendingActionsResponse {
  items: PendingActionItem[];
  totalCount: number;
}

export async function fetchPendingActions(personId?: string): Promise<PendingActionsResponse> {
  const suffix = personId ? `?personId=${encodeURIComponent(personId)}` : '';
  return httpGet<PendingActionsResponse>(`/dashboard/pending-actions${suffix}`);
}
