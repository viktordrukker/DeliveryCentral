import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MinLength, Validate } from 'class-validator';

import { WEBHOOK_EVENT_TYPES } from '@src/shared/events/webhook-event-types';
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

  /**
   * F-27 / D-170 — each value must come from the typed registry
   * (`WEBHOOK_EVENT_TYPES`). Empty array (or omitted) means "subscribe
   * to every event" — the same wildcard behaviour the in-memory
   * service already implements.
   */
  @IsArray()
  @IsString({ each: true })
  @IsIn([...WEBHOOK_EVENT_TYPES], { each: true })
  @IsOptional()
  eventTypes?: string[];

  @IsString()
  @IsOptional()
  createdByPersonId?: string;
}
