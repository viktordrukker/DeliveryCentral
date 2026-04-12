import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelCaseRequestDto {
  @ApiProperty({ description: 'Reason for cancelling the case' })
  @IsString()
  @IsNotEmpty()
  public reason!: string;
}
