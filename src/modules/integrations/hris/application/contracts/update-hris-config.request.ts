import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

const HRIS_ADAPTER_NAMES = ['bamboohr', 'workday', 'none'] as const;

class BambooHrConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public subdomain?: string;
}

class WorkdayConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public tenantUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public clientSecret?: string;
}

/**
 * F-19 / 20c-09 — typed DTO replacing the inline `Partial<HrisConfig>`
 * on `POST /admin/hris/config`. Mirrors the `HrisConfig` shape from
 * `hris-sync.service.ts` with every field optional; the service
 * merges the partial into the existing config so any subset of
 * fields is valid.
 */
export class UpdateHrisConfigRequestDto {
  @ApiPropertyOptional({ enum: HRIS_ADAPTER_NAMES })
  @IsOptional()
  @IsIn([...HRIS_ADAPTER_NAMES])
  public activeAdapter?: (typeof HRIS_ADAPTER_NAMES)[number];

  @ApiPropertyOptional({ type: BambooHrConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BambooHrConfigDto)
  public bamboohr?: BambooHrConfigDto;

  @ApiPropertyOptional({ type: WorkdayConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkdayConfigDto)
  public workday?: WorkdayConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  public fieldMapping?: Record<string, string>;
}
