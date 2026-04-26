import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  @MinLength(1)
  public name!: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsDateString()
  public plannedDate!: string;

  @IsOptional()
  @IsEnum(['PLANNED', 'IN_PROGRESS', 'HIT', 'MISSED'])
  public status?: 'PLANNED' | 'IN_PROGRESS' | 'HIT' | 'MISSED';
}

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  public name?: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsOptional()
  @IsDateString()
  public plannedDate?: string;

  @IsOptional()
  @IsDateString()
  public actualDate?: string;

  @IsOptional()
  @IsEnum(['PLANNED', 'IN_PROGRESS', 'HIT', 'MISSED'])
  public status?: 'PLANNED' | 'IN_PROGRESS' | 'HIT' | 'MISSED';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  public progressPct?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public dependsOnMilestoneIds?: string[];
}
