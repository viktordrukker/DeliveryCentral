import { IsDateString, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

// ─── Capitalisation Report ────────────────────────────────────────────────────

export interface CapitalisationProjectRow {
  projectId: string;
  projectName: string;
  capexHours: number;
  opexHours: number;
  totalHours: number;
  capexPercent: number;
  alert?: boolean;
  deviation?: number;
}

export interface CapitalisationTotals {
  capexHours: number;
  opexHours: number;
  totalHours: number;
  capexPercent: number;
}

export interface PeriodTrendPoint {
  month: string;
  capexPercent: number;
}

export interface CapitalisationReport {
  period: { from: string; to: string };
  byProject: CapitalisationProjectRow[];
  totals: CapitalisationTotals;
  periodTrend: PeriodTrendPoint[];
}

// ─── Period Locks ─────────────────────────────────────────────────────────────

export interface PeriodLockDto {
  id: string;
  periodFrom: string;
  periodTo: string;
  lockedBy: string;
  lockedAt: string;
}

export class CreatePeriodLockDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}

// ─── Project Budget ───────────────────────────────────────────────────────────

export type BudgetStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface ProjectBudgetDto {
  id: string;
  projectId: string;
  fiscalYear: number;
  capexBudget: number;
  opexBudget: number;
  status?: BudgetStatus;
}

export class UpsertProjectBudgetDto {
  @IsNumber()
  @Min(2000)
  fiscalYear!: number;

  @IsNumber()
  @Min(0)
  capexBudget!: number;

  @IsNumber()
  @Min(0)
  opexBudget!: number;
}

// ─── Person Cost Rate ─────────────────────────────────────────────────────────

export interface PersonCostRateDto {
  id: string;
  personId: string;
  effectiveFrom: string;
  hourlyRate: number;
  rateType: string;
  createdAt: string;
}

export class CreatePersonCostRateDto {
  @IsDateString()
  effectiveFrom!: string;

  @IsNumber()
  @Min(0)
  hourlyRate!: number;

  @IsString()
  @IsNotEmpty()
  rateType!: string;
}

// ─── Budget Dashboard ─────────────────────────────────────────────────────────

export interface BurnDownPoint {
  week: string;
  cumCost: number;
  budgetLine: number;
}

export interface ForecastData {
  projectedTotalCost: number;
  remainingBudget: number;
  onTrack: boolean;
}

export interface CostByRole {
  role: string;
  hours: number;
  cost: number;
}

export interface ProjectBudgetDashboard {
  budget: { capex: number; opex: number; total: number; fiscalYear: number } | null;
  burnDown: BurnDownPoint[];
  forecast: ForecastData;
  byRole: CostByRole[];
  healthColor: 'green' | 'yellow' | 'red';
}
