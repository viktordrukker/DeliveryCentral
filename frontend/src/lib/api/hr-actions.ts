import { httpGet } from './http-client';

/**
 * Issue 263 — HR action-cards payload.
 *
 * Each row is a single "do something" prompt rendered as a card in the HR
 * Actions surface. Server-sorted by severity DESC then dueAt ASC.
 */
export type HrActionCardKind =
  | 'probation_ending'
  | 'contract_expiring'
  | 'certification_stale'
  | 'missing_documentation'
  | 'hr_review_due';

export type HrActionCardSeverity = 'info' | 'warning' | 'danger';

export interface HrActionCardDto {
  kind: HrActionCardKind;
  personId: string;
  personName: string;
  /** ISO-8601 date (YYYY-MM-DD). */
  dueAt: string;
  severity: HrActionCardSeverity;
  message: string;
  /** Deep-link to the person profile with the action context. */
  href: string;
}

export async function fetchHrActionCards(
  params: { page?: number; pageSize?: number } = {},
): Promise<HrActionCardDto[]> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set('page', String(params.page));
  if (params.pageSize != null) qs.set('pageSize', String(params.pageSize));
  const suffix = qs.toString();
  return httpGet<HrActionCardDto[]>(`/hr/action-cards${suffix ? `?${suffix}` : ''}`);
}
