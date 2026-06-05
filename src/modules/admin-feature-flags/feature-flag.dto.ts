import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, ValidateIf } from 'class-validator';

/**
 * Accepts EITHER `value` (legacy / SystemFlagsSettingsList) or `enabled`
 * (LEAN-P4d-2 inline-toggle UI). At least one must be present — the
 * controller normalises to a single boolean.
 */
export class UpdateFeatureFlagDto {
  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @ValidateIf((o: UpdateFeatureFlagDto) => o.value !== undefined)
  @IsBoolean()
  public value?: boolean;

  @ApiProperty({ type: Boolean, required: false })
  @IsOptional()
  @ValidateIf((o: UpdateFeatureFlagDto) => o.enabled !== undefined)
  @IsBoolean()
  public enabled?: boolean;
}
