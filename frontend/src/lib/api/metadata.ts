import { httpGet, httpPatch, httpPost } from './http-client';

export interface MetadataDictionarySummary {
  id: string;
  dictionaryKey: string;
  displayName: string;
  description?: string;
  entityType: string;
  scopeOrgUnitId?: string | null;
  isSystemManaged: boolean;
  isArchived: boolean;
  entryCount: number;
  enabledEntryCount: number;
  relatedCustomFieldCount: number;
  workflowUsageCount: number;
}

export interface MetadataDictionaryEntry {
  id: string;
  entryKey: string;
  entryValue: string;
  displayName: string;
  sortOrder: number;
  isEnabled: boolean;
  archivedAt?: string | null;
}

export interface RelatedCustomField {
  id: string;
  fieldKey: string;
  displayName: string;
  entityType: string;
  dataType: string;
  isRequired: boolean;
}

export interface RelatedWorkflow {
  id: string;
  workflowKey: string;
  displayName: string;
  entityType: string;
  version: number;
  status: string;
}

export interface RelatedLayout {
  id: string;
  layoutKey: string;
  displayName: string;
  entityType: string;
  version: number;
  isDefault: boolean;
}

export interface MetadataDictionaryDetails extends MetadataDictionarySummary {
  entries: MetadataDictionaryEntry[];
  relatedCustomFields: RelatedCustomField[];
  relatedWorkflows: RelatedWorkflow[];
  relatedLayouts: RelatedLayout[];
}

export interface MetadataDictionaryListResponse {
  items: MetadataDictionarySummary[];
}

export interface CreateMetadataDictionaryEntryRequest {
  displayName: string;
  entryKey: string;
  entryValue: string;
  sortOrder?: number;
}

export interface FetchMetadataDictionariesParams {
  entityType?: string;
  search?: string;
  scopeOrgUnitId?: string;
}

export async function fetchMetadataDictionaries(
  params: FetchMetadataDictionariesParams = {},
): Promise<MetadataDictionaryListResponse> {
  const searchParams = new URLSearchParams();

  if (params.entityType) {
    searchParams.set('entityType', params.entityType);
  }

  if (params.search) {
    searchParams.set('search', params.search);
  }

  if (params.scopeOrgUnitId) {
    searchParams.set('scopeOrgUnitId', params.scopeOrgUnitId);
  }

  const query = searchParams.toString();

  return httpGet<MetadataDictionaryListResponse>(
    `/metadata/dictionaries${query.length > 0 ? `?${query}` : ''}`,
  );
}

export async function fetchMetadataDictionaryById(
  id: string,
): Promise<MetadataDictionaryDetails> {
  return httpGet<MetadataDictionaryDetails>(`/metadata/dictionaries/${id}`);
}

export async function createMetadataDictionaryEntry(
  type: string,
  request: CreateMetadataDictionaryEntryRequest,
): Promise<MetadataDictionaryEntry> {
  return httpPost<MetadataDictionaryEntry, CreateMetadataDictionaryEntryRequest>(
    `/metadata/dictionaries/${type}/entries`,
    request,
  );
}

export async function toggleMetadataDictionaryEntry(
  entryId: string,
  isEnabled: boolean,
): Promise<MetadataDictionaryEntry> {
  return httpPatch<MetadataDictionaryEntry, { isEnabled: boolean }>(
    `/metadata/dictionaries/entries/${entryId}`,
    { isEnabled },
  );
}
