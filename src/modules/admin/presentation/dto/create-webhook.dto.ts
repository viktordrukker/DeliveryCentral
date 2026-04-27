import { IsArray, IsNotEmpty, IsOptional, IsString, MinLength, Validate } from 'class-validator';

import { SafeUrlConstraint } from '@src/shared/validators/safe-url.validator';

export class CreateWebhookDto {
  @IsString()
  @IsNotEmpty()
  @Validate(SafeUrlConstraint)
  url!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(16)
  secret!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  eventTypes?: string[];

  @IsString()
  @IsOptional()
  createdByPersonId?: string;
}
