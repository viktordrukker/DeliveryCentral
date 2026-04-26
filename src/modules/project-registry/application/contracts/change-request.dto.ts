import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateChangeRequestDto {
  @IsString()
  @MinLength(1)
  public title!: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  public severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsBoolean()
  public outOfBaseline?: boolean;

  @IsOptional()
  @IsString()
  public impactScope?: string;

  @IsOptional()
  @IsString()
  public impactSchedule?: string;

  @IsOptional()
  @IsString()
  public impactBudget?: string;
}

export class UpdateChangeRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  public title?: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsOptional()
  @IsEnum(['PROPOSED', 'APPROVED', 'REJECTED', 'WITHDRAWN'])
  public status?: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  public severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsBoolean()
  public outOfBaseline?: boolean;

  @IsOptional()
  @IsString()
  public impactScope?: string;

  @IsOptional()
  @IsString()
  public impactSchedule?: string;

  @IsOptional()
  @IsString()
  public impactBudget?: string;
}
