export type ProjectShape = 'SMALL' | 'STANDARD' | 'ENTERPRISE' | 'PROGRAM';

export const SHAPE_LABELS: Record<ProjectShape, string> = {
  SMALL: 'Small',
  STANDARD: 'Standard',
  ENTERPRISE: 'Enterprise',
  PROGRAM: 'Program',
};

// v2 wires only SMALL + STANDARD. ENTERPRISE/PROGRAM render like STANDARD with a banner.
export const V2_WIRED_SHAPES: ProjectShape[] = ['SMALL', 'STANDARD'];

export const SHAPE_ACTIVE_AXES: Record<ProjectShape, string[]> = {
  SMALL: [
    // Top-level quadrant signals only — one per quadrant.
    'scopeCreep',
    'milestoneAdherence',
    'costPerformanceIndex',
    'staffingFillRate',
  ],
  STANDARD: [
    'scopeCreep',
    'requirementsStability',
    'milestoneAdherence',
    'timelineDeviation',
    'costPerformanceIndex',
    'spendRate',
    'staffingFillRate',
    'teamMood',
  ],
  ENTERPRISE: [
    'requirementsStability',
    'scopeCreep',
    'deliverableAcceptance',
    'changeRequestBurden',
    'milestoneAdherence',
    'timelineDeviation',
    'criticalPathHealth',
    'velocityTrend',
    'costPerformanceIndex',
    'spendRate',
    'forecastAccuracy',
    'capexCompliance',
    'staffingFillRate',
    'teamMood',
    'overAllocationRate',
    'keyPersonRisk',
  ],
  PROGRAM: [
    'requirementsStability',
    'scopeCreep',
    'deliverableAcceptance',
    'changeRequestBurden',
    'milestoneAdherence',
    'timelineDeviation',
    'criticalPathHealth',
    'velocityTrend',
    'costPerformanceIndex',
    'spendRate',
    'forecastAccuracy',
    'capexCompliance',
    'staffingFillRate',
    'teamMood',
    'overAllocationRate',
    'keyPersonRisk',
  ],
};

export function activeAxesFor(shape: ProjectShape | undefined | null): string[] {
  if (!shape) return SHAPE_ACTIVE_AXES.STANDARD;
  return SHAPE_ACTIVE_AXES[shape] ?? SHAPE_ACTIVE_AXES.STANDARD;
}

export function isAxisActive(shape: ProjectShape | undefined | null, axisKey: string): boolean {
  return activeAxesFor(shape).includes(axisKey);
}

export function ganttEnabledFor(shape: ProjectShape | undefined | null): boolean {
  if (!shape) return true;
  return shape !== 'SMALL';
}

export function defaultReportingTier(shape: ProjectShape | undefined | null): 'A' | 'B' {
  if (shape === 'SMALL') return 'A';
  return 'B';
}
