import { httpGet, httpPost } from './http-client';

export type DmEscalationStatus = 'PENDING' | 'CONFIRMED' | 'OVERRIDDEN' | 'CANCELLED';
export type DmEscalationSourceKind = 'timesheet' | 'work-hour' | 'milestone' | 'leave';

export interface DmEscalation {
  id: string;
  publicId: string | null;
  sourceKind: DmEscalationSourceKind;
  sourceId: string;
  reason: string;
  status: DmEscalationStatus;
  escalatedByPersonId: string;
  escalatedByDisplayName: string | null;
  escalatedToPersonId: string | null;
  escalatedToDisplayName: string | null;
  resolvedAt: string | null;
  resolvedByPersonId: string | null;
  resolvedByDisplayName: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDmEscalationInput {
  sourceKind: DmEscalationSourceKind;
  sourceId: string;
  reason: string;
  escalatedToPersonId?: string;
}

export async function createDmEscalation(
  input: CreateDmEscalationInput,
): Promise<DmEscalation> {
  return httpPost<DmEscalation, CreateDmEscalationInput>('/dm-escalations', input);
}

export async function listPendingDmEscalations(): Promise<DmEscalation[]> {
  return httpGet<DmEscalation[]>('/dm-escalations/pending');
}

export async function listMyDmEscalations(): Promise<DmEscalation[]> {
  return httpGet<DmEscalation[]>('/dm-escalations/mine');
}

export async function confirmDmEscalation(
  id: string,
  notes?: string,
): Promise<DmEscalation> {
  return httpPost<DmEscalation, { notes?: string }>(`/dm-escalations/${id}/confirm`, {
    notes,
  });
}

export async function overrideDmEscalation(
  id: string,
  notes?: string,
): Promise<DmEscalation> {
  return httpPost<DmEscalation, { notes?: string }>(`/dm-escalations/${id}/override`, {
    notes,
  });
}

export async function cancelDmEscalation(
  id: string,
  notes?: string,
): Promise<DmEscalation> {
  return httpPost<DmEscalation, { notes?: string }>(`/dm-escalations/${id}/cancel`, {
    notes,
  });
}
