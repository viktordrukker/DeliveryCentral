import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * F-9.2 / 20c-09 — typed body for `POST /admin/system/migrations/apply`.
 * Replaces inline `@Body() body: { wipeFirst?: boolean } = {}`.
 */
export class ApplyMigrationsBodyDto {
  @ApiPropertyOptional({ description: 'When true, wipe the schema before re-applying migrations.' })
  @IsOptional()
  @IsBoolean()
  public wipeFirst?: boolean;
}

/**
 * F-9.2 / 20c-09 — typed body for `/setup/*` step endpoints that require a runId.
 * Replaces inline `@Body() body: { runId: string }`.
 */
export class SetupStepBodyDto {
  @ApiProperty({ description: 'Setup-run identifier issued by /setup/start.' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  public runId!: string;
}
