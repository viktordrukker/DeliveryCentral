import { ApiProperty } from '@nestjs/swagger';

/**
 * Portfolio-level finance summary for a fiscal year. Aggregates the per-project
 * ProjectBudget rows (capex + opex + vendor + actualCost + earnedValue) into
 * one CFO-grade scoreboard that the Director dashboard renders as a finance
 * band. CPI (cost performance index) = earnedValue / actualCost, two-decimal,
 * 0 when actualCost is zero so the FE can fall back to a neutral tone.
 */
export class PortfolioFinanceSummaryDto {
  @ApiProperty() fiscalYear!: number;
  @ApiProperty() projectCount!: number;
  /** Sum of (capexBudget + opexBudget + vendorBudget) across every ProjectBudget for the year. */
  @ApiProperty() totalBudget!: number;
  @ApiProperty() totalActualCost!: number;
  @ApiProperty() totalEarnedValue!: number;
  /** earnedValue / actualCost. 0 when actualCost is zero. */
  @ApiProperty() cpi!: number;
  /** Count of projects whose actualCost exceeded their BAC (capex+opex+vendor). */
  @ApiProperty() overBudgetProjectCount!: number;
}
