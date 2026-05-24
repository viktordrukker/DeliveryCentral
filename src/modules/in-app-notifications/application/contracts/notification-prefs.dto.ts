import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class NotificationPreferenceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  channelKey!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}

export class UpdateNotificationPreferencesDto {
  // The local `ValidationPipe({ whitelist: true })` strips properties that
  // have no class-validator decorators. Without `@IsArray` + `@ValidateNested`
  // + `@Type` here, `preferences` was being silently dropped from the request
  // body and the service crashed on `.map()` of undefined.
  @ApiProperty({ type: [NotificationPreferenceDto] })
  @IsArray()
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceDto)
  preferences!: NotificationPreferenceDto[];
}

// ds-trunk-10 — digest + quiet-hours settings, per-person.
export enum DigestScheduleApi {
  IMMEDIATE = 'IMMEDIATE',
  DAILY_9AM = 'DAILY_9AM',
  WEEKLY_MON_9AM = 'WEEKLY_MON_9AM',
}

const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class NotificationDigestDto {
  @ApiProperty({ enum: DigestScheduleApi })
  @IsEnum(DigestScheduleApi)
  digestSchedule!: DigestScheduleApi;

  @ApiProperty({ type: String, nullable: true, example: '20:00' })
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @Matches(HHMM_PATTERN, { message: 'quietHoursStart must be HH:MM (24-hour)' })
  quietHoursStart!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '08:00' })
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @Matches(HHMM_PATTERN, { message: 'quietHoursEnd must be HH:MM (24-hour)' })
  quietHoursEnd!: string | null;

  @ApiProperty({ default: true })
  @IsBoolean()
  quietHoursEmailOnly!: boolean;
}

export class UpdateNotificationDigestDto {
  @ApiProperty({ enum: DigestScheduleApi, required: false })
  @IsOptional()
  @IsEnum(DigestScheduleApi)
  digestSchedule?: DigestScheduleApi;

  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @Matches(HHMM_PATTERN, { message: 'quietHoursStart must be HH:MM (24-hour)' })
  quietHoursStart?: string | null;

  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @Matches(HHMM_PATTERN, { message: 'quietHoursEnd must be HH:MM (24-hour)' })
  quietHoursEnd?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  quietHoursEmailOnly?: boolean;
}
