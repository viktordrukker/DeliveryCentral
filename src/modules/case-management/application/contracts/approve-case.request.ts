import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveCaseRequestDto {
  @ApiPropertyOptional({ description: 'Optional approval reason / note.' })
  @IsOptional()
  @IsString()
  public reason?: string;
}

export class RejectCaseRequestDto {
  @ApiPropertyOptional({ description: 'Reason for rejecting the case.' })
  @IsString()
  public reason!: string;
}
