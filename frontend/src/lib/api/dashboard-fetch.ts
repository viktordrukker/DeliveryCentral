import { httpGet } from './http-client';

/**
 * F-15.2 / 20c-14 — shared dashboard fetch helper.
 *
 * Six `dashboard-*.ts` modules duplicated the same `URLSearchParams`
 * + `httpGet` wrapping pattern with a single `asOf` query param plus
 * an optional `personId`. This helper centralises that boilerplate
 * so each module only owns its return type + endpoint path.
 *
 * Usage:
 *   return fetchDashboardEndpoint<DirectorDashboardResponse>(
 *     '/dashboard/director',
 *     { asOf },
 *   );
 */
export interface DashboardFetchParams {
  asOf?: string;
  personId?: string;
}

export async function fetchDashboardEndpoint<T>(
  path: string,
  params: DashboardFetchParams = {},
): Promise<T> {
  const searchParams = new URLSearchParams();
  if (params.asOf) searchParams.set('asOf', params.asOf);
  if (params.personId) searchParams.set('personId', params.personId);
  const suffix = searchParams.toString();
  return httpGet<T>(`${path}${suffix ? `?${suffix}` : ''}`);
}
