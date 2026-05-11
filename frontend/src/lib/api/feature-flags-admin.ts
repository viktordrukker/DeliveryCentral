import { httpGet, httpPatch } from './http-client';

export interface FeatureFlagAdminEntry {
  id: string;
  key: string;
  description: string;
  category: string;
  maturityLevel: 'scaffolded' | 'developing' | 'beta' | 'ga' | 'deprecated';
  expectedGaSprint?: string;
  owner: string;
  dependsOn?: string[];
  default: boolean;
  currentValue: boolean;
}

export interface UpdateFeatureFlagResponse {
  id: string;
  key: string;
  previousValue: boolean;
  currentValue: boolean;
}

export async function fetchFeatureFlags(): Promise<FeatureFlagAdminEntry[]> {
  return httpGet<FeatureFlagAdminEntry[]>('/admin/feature-flags');
}

export async function updateFeatureFlag(
  id: string,
  value: boolean,
): Promise<UpdateFeatureFlagResponse> {
  return httpPatch<UpdateFeatureFlagResponse, { value: boolean }>(`/admin/feature-flags/${id}`, {
    value,
  });
}
