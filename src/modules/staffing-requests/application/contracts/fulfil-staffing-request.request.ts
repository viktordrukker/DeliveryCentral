import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * F-19 / 20c-09 — typed DTO replacing the inline `FulfilBody`
 * type-alias on `POST /staffing-requests/:id/fulfil`. Endpoint is
 * deprecated (sunset 2026-12-01, successor `/proposals/:slateId/pick`)
 * but still reachable; tightening the body shape costs nothing.
 */
export class FulfilStaffingRequestRequestDto {
  @ApiProperty({ description: 'Person who will be assigned to the request.' })
  @IsString()
  @IsNotEmpty()
  @Matches(UUID_RE)
  public assignedPersonId!: string;

  @ApiProperty({ description: 'Person submitting the fulfilment proposal.' })
  @IsString()
  @IsNotEmpty()
  @Matches(UUID_RE)
  public proposedByPersonId!: string;
}
