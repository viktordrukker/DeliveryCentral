export type SpcDataSource = 'live' | 'demo' | 'override';

export interface SpcWeekPoint {
  weekStarting: string;
  hours: number;
  cost: number;
}

export interface SpcBurndownDto {
  projectId: string;
  points: SpcWeekPoint[];
  totalHours: number;
  totalSpcCost: number;
  vendorAccrualToDate: number;
  bac: number | null;
  appliedHourlyRate: number | null;
  rateSource: 'role-plan' | 'org-default' | null;
  dataSource: SpcDataSource;
}
