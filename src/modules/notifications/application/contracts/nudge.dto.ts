import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class NudgeRequestDto {
  @ApiProperty({ description: 'Identifier of the pending approval target (e.g. staffing request id, timesheet id, case id).' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  requestId!: string;

  @ApiProperty({ description: 'Person who should receive the nudge (the approver).' })
  @IsUUID()
  approverId!: string;
}
