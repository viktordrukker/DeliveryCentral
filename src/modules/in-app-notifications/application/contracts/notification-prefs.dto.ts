import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

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
