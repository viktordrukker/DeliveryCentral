import { describe, expect, it } from 'vitest';

import {
  RISK_CATEGORY_LABELS,
  RISK_STATUS_LABELS,
  RISK_STRATEGY_LABELS,
  RISK_TYPE_LABELS,
  formatRiskCategory,
  formatRiskStatus,
  formatRiskStrategy,
  formatRiskType,
} from './risk-labels';

describe('risk-labels — D-131 FE displayName wiring', () => {
  it('exposes label maps mirroring the seeded MetadataDictionary displayNames', () => {
    expect(RISK_TYPE_LABELS.RISK).toBe('Risk');
    expect(RISK_TYPE_LABELS.ISSUE).toBe('Issue');
    expect(RISK_CATEGORY_LABELS.TECHNICAL).toBe('Technical');
    expect(RISK_STRATEGY_LABELS.MITIGATE).toBe('Mitigate');
    expect(RISK_STATUS_LABELS.CONVERTED_TO_ISSUE).toBe('Converted to Issue');
  });

  it('formatRiskType/Category/Strategy/Status return the displayName for known values', () => {
    expect(formatRiskType('RISK')).toBe('Risk');
    expect(formatRiskCategory('BUDGET')).toBe('Budget');
    expect(formatRiskStrategy('ESCALATE')).toBe('Escalate');
    expect(formatRiskStatus('MITIGATING')).toBe('Mitigating');
  });

  it('formatters pass through unknown tenant-custom values verbatim', () => {
    expect(formatRiskCategory('SUPPLY_CHAIN')).toBe('SUPPLY_CHAIN');
    expect(formatRiskStatus('RECLASSIFIED')).toBe('RECLASSIFIED');
  });

  it('formatters return em-dash for nullish input', () => {
    expect(formatRiskType(null)).toBe('—');
    expect(formatRiskCategory(undefined)).toBe('—');
    expect(formatRiskStrategy('')).toBe('—');
    expect(formatRiskStatus(null)).toBe('—');
  });
});
