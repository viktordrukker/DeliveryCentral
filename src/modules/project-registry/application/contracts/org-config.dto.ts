export type ReportingCadence = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';
export type PmReassignmentPolicy = 'pm-or-director-or-admin' | 'director-approval';
export type DefaultShape = 'SMALL' | 'STANDARD';

export interface OrgConfigDto {
  id: string;
  reportingCadence: ReportingCadence;
  tierLabels: { A: string; B: string };
  exceptionAxisThreshold: number;
  riskCadenceMap: Record<string, number>;
  crStaleThresholdDays: number;
  milestoneSlippedGraceDays: number;
  timesheetGapDays: number;
  pmReassignmentPolicy: PmReassignmentPolicy;
  defaultShapeForNewProject: DefaultShape;
  defaultHourlyRate: number | null;
  ragThresholdCritical: number;
  ragThresholdRed: number;
  ragThresholdAmber: number;
  colourBlindMode: boolean;
  updatedAt: string;
  updatedByPersonId: string | null;
}

export interface UpdateOrgConfigDto {
  reportingCadence?: ReportingCadence;
  tierLabels?: { A?: string; B?: string };
  exceptionAxisThreshold?: number;
  riskCadenceMap?: Record<string, number>;
  crStaleThresholdDays?: number;
  milestoneSlippedGraceDays?: number;
  timesheetGapDays?: number;
  pmReassignmentPolicy?: PmReassignmentPolicy;
  defaultShapeForNewProject?: DefaultShape;
  defaultHourlyRate?: number | null;
  ragThresholdCritical?: number;
  ragThresholdRed?: number;
  ragThresholdAmber?: number;
  colourBlindMode?: boolean;
}
