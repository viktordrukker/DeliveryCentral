/**
 * FE-#263 — HR action-cards payload.
 *
 * Each row is a single "do something" prompt rendered as a card in the
 * HR Actions tab. Sorted server-side by severity DESC then dueAt ASC.
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
  /** ISO-8601 date (YYYY-MM-DD). The deadline / event date for this card. */
  dueAt: string;
  severity: HrActionCardSeverity;
  message: string;
  /** Deep-link to the person profile with the action context. */
  href: string;
}
