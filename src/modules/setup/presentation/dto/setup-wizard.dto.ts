import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

import { SEED_PROFILES, type SeedProfile } from '../../domain/step-keys';

export class StartRunDto {
  @IsOptional()
  @IsString()
  public runId?: string;
}

export class TenantStepDto {
  @IsString()
  @Length(2, 32)
  public code!: string;

  @IsString()
  @Length(2, 128)
  public name!: string;

  @IsString()
  public timezone!: string;

  @IsString()
  public locale!: string;

  @IsString()
  @Length(3, 3)
  public currency!: string;
}

export class AdminStepDto {
  @IsEmail()
  public email!: string;

  @IsString()
  @Length(12, 256)
  public password!: string;

  @IsOptional()
  @IsString()
  public displayName?: string;
}

export class IntegrationsStepDto {
  @IsOptional()
  @IsString()
  public smtpHost?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  public smtpPort?: number;

  @IsOptional()
  @IsString()
  public smtpUser?: string;

  @IsOptional()
  @IsString()
  public smtpPassword?: string;

  @IsOptional()
  @IsBoolean()
  public smtpSecure?: boolean;

  @IsOptional()
  @IsString()
  public emailFromAddress?: string;

  @IsOptional()
  @IsString()
  public corsOrigin?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Type(() => Number)
  public accessTokenExpiresInSec?: number;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Type(() => Number)
  public refreshTokenExpiresInSec?: number;
}

export class SmtpTestDto {
  @IsEmail()
  public recipient!: string;
}

export class MonitoringForwarderDto {
  @IsBoolean()
  public enabled!: boolean;

  @IsOptional()
  @IsString()
  public endpoint?: string;

  @IsOptional()
  @IsString()
  public hecUrl?: string;

  @IsOptional()
  @IsString()
  public token?: string;

  @IsOptional()
  @IsString()
  public apiKey?: string;

  @IsOptional()
  @IsString()
  public region?: string;

  @IsOptional()
  @IsString()
  public host?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  public port?: number;

  @IsOptional()
  @IsString()
  public headers?: string;
}

export class MonitoringStepDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => MonitoringForwarderDto)
  public otlp?: MonitoringForwarderDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MonitoringForwarderDto)
  public splunk?: MonitoringForwarderDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MonitoringForwarderDto)
  public datadog?: MonitoringForwarderDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MonitoringForwarderDto)
  public syslog?: MonitoringForwarderDto;
}

export class SeedStepDto {
  @IsIn([...SEED_PROFILES])
  public profile!: SeedProfile;
}

export class ResetDto {
  @IsString()
  public confirm!: string;

  @IsIn([...SEED_PROFILES])
  public profile!: SeedProfile;
}

export class MigrationsApplyDto {
  @IsOptional()
  @IsBoolean()
  public wipeFirst?: boolean;

  @IsOptional()
  @IsString()
  public runId?: string;
}
