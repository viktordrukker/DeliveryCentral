import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsNotEmpty()
  secret!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  eventTypes?: string[];

  @IsString()
  @IsOptional()
  createdByPersonId?: string;
}
