import { StaffingDeskRowDto } from './staffing-desk-row.dto';

export interface SupplyDemandMetrics {
  totalPeople: number;
  availableFte: number;
  benchCount: number;
  totalHeadcountRequired: number;
  headcountFulfilled: number;
  /**
   * PR-16 (Decision E) — canonical OPEN demand: count of `fillStatus = OPEN`
   * positions. Agrees with the Director "open positions" KPI and the
   * bench-matching pool. Does NOT include PROPOSED (see `headcountInProgress`).
   */
  headcountOpen: number;
  /** PR-16 (Decision E) — in-progress demand: count of `fillStatus = PROPOSED`. */
  headcountInProgress: number;
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
