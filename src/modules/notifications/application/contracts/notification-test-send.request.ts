import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class NotificationTestSendRequestDto {
  @IsString()
  @IsNotEmpty()
  channelKey!: string;

  @IsString()
  @IsNotEmpty()
  templateKey!: string;

  @IsString()
  @IsNotEmpty()
  recipient!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
