export type PulseReportTier = 'A' | 'B';
export type PulseRagRating = 'GREEN' | 'AMBER' | 'RED' | 'CRITICAL';

export type PulseQuadrantKey = 'scope' | 'schedule' | 'budget' | 'people';

/**
 * Per-quadrant entry. `tier` is retained for backwards compatibility with v2
 * records; v2.1 forms no longer expose it — the presence of a narrative is the
 * implicit "Tier B" signal.
 */
export interface PulseDimensionEntry {
  tier: PulseReportTier;
  rag: PulseRagRating | null;
  narrative: string | null;
}

/** Optional per-sub-dimension narrative captured via the "Detailed status" modal. */
export interface PulseDetailedEntry {
  narrative: string | null;
}

export interface PulseReportDimensions {
  scope: PulseDimensionEntry;
  schedule: PulseDimensionEntry;
  budget: PulseDimensionEntry;
  people: PulseDimensionEntry;
  /** keyed by sub-dimension key (e.g. `scopeCreep`, `teamMood`) */
  detailed?: Record<string, PulseDetailedEntry>;
}

export interface PulseReportDto {
  id: string | null;
  projectId: string;
  weekStarting: string;
  dimensions: PulseReportDimensions;
  overallNarrative: string | null;
  submittedByPersonId: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
}

export interface UpsertPulseReportDto {
  weekStarting?: string;
  dimensions: Partial<Omit<PulseReportDimensions, 'detailed'>> & {
    detailed?: Record<string, PulseDetailedEntry>;
  };
  overallNarrative?: string | null;
  submit?: boolean;
}
