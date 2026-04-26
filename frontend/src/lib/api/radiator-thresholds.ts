import { httpGet, httpPut } from './http-client';

export type ThresholdDirection = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';

export interface ThresholdConfigDto {
  subDimensionKey: string;
  thresholdScore4: number;
  thresholdScore3: number;
  thresholdScore2: number;
  thresholdScore1: number;
  direction: ThresholdDirection;
  isDefault: boolean;
}

export interface ThresholdUpsertRequest {
  thresholdScore4: number;
  thresholdScore3: number;
  thresholdScore2: number;
  thresholdScore1: number;
  direction: ThresholdDirection;
}

export async function fetchThresholdConfigs(): Promise<ThresholdConfigDto[]> {
  return httpGet<ThresholdConfigDto[]>('/admin/radiator-thresholds');
}

export async function upsertThresholdConfig(
  subDimensionKey: string,
  data: ThresholdUpsertRequest,
): Promise<{ ok: boolean }> {
  return httpPut<{ ok: boolean }, ThresholdUpsertRequest>(`/admin/radiator-thresholds/${subDimensionKey}`, data);
}
