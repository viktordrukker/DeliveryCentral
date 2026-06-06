import { httpGet } from './http-client';

export interface HeadcountTrendPoint {
  count: number;
  month: string;
}

export async function fetchHeadcountTrend(months = 6): Promise<HeadcountTrendPoint[]> {
  return httpGet<HeadcountTrendPoint[]>(`/dashboard/headcount/trend?months=${months}`);
}
