import { StaffingDeskRowDto } from './staffing-desk-row.dto';

export interface SupplyDemandMetrics {
  totalPeople: number;
  availableFte: number;
  benchCount: number;
  totalHeadcountRequired: number;
  headcountFulfilled: number;
  headcountOpen: number;
  gapHc: number;
  fillRatePercent: number;
  avgDaysToFulfil: number;
}

export interface StaffingDeskKpis {
  activeAssignments: number;
  openRequests: number;
  avgAllocationPercent: number;
  overallocatedPeople: number;
}

export interface StaffingDeskResponseDto {
  items: StaffingDeskRowDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  kpis: StaffingDeskKpis;
  supplyDemand: SupplyDemandMetrics;
}
