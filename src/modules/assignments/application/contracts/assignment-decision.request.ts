import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class AssignmentDecisionRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  public actorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public reason?: string;
}
