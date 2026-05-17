/**
 * F-12.3 / D-131 — risk-enum display labels.
 *
 * Mirrors the `risk-{type,category,strategy,status}` MetadataDictionary
 * entries seeded in F-12.1 (`prisma/seed.ts`). When admins rename
 * entries via `/metadata-admin`, the canonical source becomes the live
 * dictionary; consumers should resolve labels via the dictionary API
 * (`fetchMetadataDictionaryById` → `entry.displayName`). This module
 * provides type-safe static fallbacks for the common case where a
 * render doesn't want the async hop and tenants stick to the seeded
 * defaults.
 *
 * If you need the live label (post-admin-rename), prefer:
 *   `useMetadataDictionary('risk-category').entryFor(value).displayName`
 *
 * The hooks above are out of scope for D-131; this module just gives
 * pages a single canonical default to render.
 */

import type { RiskCategory, RiskStatus, RiskStrategy, RiskType } from './api/project-risks';

export const RISK_TYPE_LABELS: Readonly<Record<RiskType, string>> = {
  RISK: 'Risk',
  ISSUE: 'Issue',
};

export const RISK_CATEGORY_LABELS: Readonly<Record<RiskCategory, string>> = {
  SCOPE: 'Scope',
  SCHEDULE: 'Schedule',
  BUDGET: 'Budget',
  BUSINESS: 'Business',
  TECHNICAL: 'Technical',
  OPERATIONAL: 'Operational',
};

export const RISK_STRATEGY_LABELS: Readonly<Record<RiskStrategy, string>> = {
  MITIGATE: 'Mitigate',
  ACCEPT: 'Accept',
  TRANSFER: 'Transfer',
  AVOID: 'Avoid',
  ESCALATE: 'Escalate',
};

export const RISK_STATUS_LABELS: Readonly<Record<RiskStatus, string>> = {
  IDENTIFIED: 'Identified',
  ASSESSED: 'Assessed',
  MITIGATING: 'Mitigating',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CONVERTED_TO_ISSUE: 'Converted to Issue',
};

export function formatRiskType(value: RiskType | string | null | undefined): string {
  if (!value) return '—';
  return RISK_TYPE_LABELS[value as RiskType] ?? value;
}

export function formatRiskCategory(value: RiskCategory | string | null | undefined): string {
  if (!value) return '—';
  return RISK_CATEGORY_LABELS[value as RiskCategory] ?? value;
}

export function formatRiskStrategy(value: RiskStrategy | string | null | undefined): string {
  if (!value) return '—';
  return RISK_STRATEGY_LABELS[value as RiskStrategy] ?? value;
}

export function formatRiskStatus(value: RiskStatus | string | null | undefined): string {
  if (!value) return '—';
  return RISK_STATUS_LABELS[value as RiskStatus] ?? value;
}
