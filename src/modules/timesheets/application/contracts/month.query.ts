import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

const YEAR_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * Query DTO for month-scoped timesheet endpoints. Validates "YYYY-MM" format
 * before reaching the service so parseInt(NaN) is impossible.
 */
export class MonthQueryDto {
  @ApiProperty({ example: '2026-04', description: 'Year-month in YYYY-MM format' })
  @IsString()
  @Matches(YEAR_MONTH_PATTERN, { message: 'month must be in YYYY-MM format with month 01-12' })
  public month!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public personId?: string;
}

export function parseMonthQuery(month: string): { year: number; month: number } {
  const match = month.match(YEAR_MONTH_PATTERN);
  if (!match) {
    throw new Error(`Invalid month format: ${month}`);
  }
  return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) };
}
