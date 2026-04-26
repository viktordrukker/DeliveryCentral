export type PulseQuadrantKey = 'scope' | 'schedule' | 'budget' | 'people';

export type PulseNarrativeField = 'narrative' | 'accomplishments' | 'nextSteps' | 'riskSummary';

export const AXIS_TO_QUADRANT: Record<string, PulseQuadrantKey> = {
  requirementsStability: 'scope',
  scopeCreep: 'scope',
  deliverableAcceptance: 'scope',
  changeRequestBurden: 'scope',
  milestoneAdherence: 'schedule',
  timelineDeviation: 'schedule',
  criticalPathHealth: 'schedule',
  velocityTrend: 'schedule',
  costPerformanceIndex: 'budget',
  spendRate: 'budget',
  forecastAccuracy: 'budget',
  capexCompliance: 'budget',
  staffingFillRate: 'people',
  teamMood: 'people',
  overAllocationRate: 'people',
  keyPersonRisk: 'people',
};

export const NARRATIVE_FIELD_TO_QUADRANTS: Record<PulseNarrativeField, PulseQuadrantKey[]> = {
  narrative: ['scope', 'schedule', 'budget', 'people'],
  accomplishments: ['scope', 'schedule'],
  nextSteps: ['schedule', 'people'],
  riskSummary: ['scope', 'schedule', 'budget', 'people'],
};

export function quadrantForAxis(axisKey: string): PulseQuadrantKey | null {
  return AXIS_TO_QUADRANT[axisKey] ?? null;
}

export function quadrantsForField(field: PulseNarrativeField): PulseQuadrantKey[] {
  return NARRATIVE_FIELD_TO_QUADRANTS[field] ?? [];
}
