import { httpDelete, httpGet, httpPatch, httpPost } from './http-client';

// HD-3 — admin client for rate cards + entries.

export interface RateCard {
  id: string;
  name: string;
  currencyCode: string;
  clientId: string | null;
  clientName: string | null;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  notes: string | null;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  entryCount: number;
}

export interface RateCardEntry {
  id: string;
  rateCardId: string;
  staffingRole: string;
  grade: string;
  requiredSkills: string[];
  hourlyRate: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  pinnedAssignmentCount: number;
}

export interface RateCardWithEntries extends RateCard {
  entries: RateCardEntry[];
}

export interface CreateRateCardRequest {
  name: string;
  currencyCode: string;
  clientId?: string | null;
  validFrom: string;
  validTo?: string | null;
  notes?: string;
  tenantId?: string | null;
}

export interface UpdateRateCardRequest {
  name?: string;
  validFrom?: string;
  validTo?: string | null;
  isActive?: boolean;
  notes?: string | null;
}

export interface CreateRateCardEntryRequest {
  staffingRole: string;
  grade: string;
  requiredSkills?: string[];
  hourlyRate: number;
  notes?: string;
}

export interface UpdateRateCardEntryRequest {
  requiredSkills?: string[];
  hourlyRate?: number;
  isActive?: boolean;
  notes?: string | null;
}

export async function listRateCards(filter?: {
  clientId?: string;
  includeArchived?: boolean;
}): Promise<RateCard[]> {
  const params = new URLSearchParams();
  if (filter?.clientId) params.set('clientId', filter.clientId);
  if (filter?.includeArchived) params.set('includeArchived', 'true');
  const qs = params.toString();
  return httpGet<RateCard[]>(`/admin/rate-cards${qs ? `?${qs}` : ''}`);
}

export async function fetchRateCard(id: string): Promise<RateCardWithEntries> {
  return httpGet<RateCardWithEntries>(`/admin/rate-cards/${id}`);
}

export async function createRateCard(data: CreateRateCardRequest): Promise<RateCard> {
  return httpPost<RateCard, CreateRateCardRequest>('/admin/rate-cards', data);
}

export async function updateRateCard(
  id: string,
  data: UpdateRateCardRequest,
): Promise<RateCard> {
  return httpPatch<RateCard, UpdateRateCardRequest>(`/admin/rate-cards/${id}`, data);
}

export async function archiveRateCard(id: string): Promise<RateCard> {
  return httpDelete<RateCard>(`/admin/rate-cards/${id}`);
}

export async function createRateCardEntry(
  cardId: string,
  data: CreateRateCardEntryRequest,
): Promise<RateCardEntry> {
  return httpPost<RateCardEntry, CreateRateCardEntryRequest>(
    `/admin/rate-cards/${cardId}/entries`,
    data,
  );
}

export async function updateRateCardEntry(
  cardId: string,
  entryId: string,
  data: UpdateRateCardEntryRequest,
): Promise<RateCardEntry> {
  return httpPatch<RateCardEntry, UpdateRateCardEntryRequest>(
    `/admin/rate-cards/${cardId}/entries/${entryId}`,
    data,
  );
}

export async function archiveRateCardEntry(
  cardId: string,
  entryId: string,
): Promise<RateCardEntry> {
  return httpDelete<RateCardEntry>(`/admin/rate-cards/${cardId}/entries/${entryId}`);
}
