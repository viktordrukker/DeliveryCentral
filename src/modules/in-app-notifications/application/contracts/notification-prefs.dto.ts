import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';

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
  @ApiProperty({ type: [NotificationPreferenceDto] })
  preferences!: NotificationPreferenceDto[];
}
