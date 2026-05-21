import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * F-71 / 20c-09 — typed body DTO for `POST /projects/:id/budget-change-requests`.
 * Replaces inline `@Body() dto: { fiscalYear: number; capexBudget: number;
 * opexBudget: number; reason?: string }`.
 */
export class RequestBudgetChangeBodyDto {
  @ApiProperty({ description: 'Fiscal year for which budget change is requested.', minimum: 1900, maximum: 9999 })
  @IsInt()
  @Min(1900)
  @Max(9999)
  public fiscalYear!: number;

  @ApiProperty({ description: 'Requested CAPEX budget (whole-unit currency).', minimum: 0 })
  @IsNumber()
  @Min(0)
  public capexBudget!: number;

  @ApiProperty({ description: 'Requested OPEX budget (whole-unit currency).', minimum: 0 })
  @IsNumber()
  @Min(0)
  public opexBudget!: number;

  @ApiPropertyOptional({ description: 'Free-text rationale for the budget change.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public reason?: string;
}
