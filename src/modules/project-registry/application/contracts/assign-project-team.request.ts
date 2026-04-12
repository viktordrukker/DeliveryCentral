import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  
  IsNumber,
  IsDateString,
  Min,
  Max,
  
  
  Matches,
} from 'class-validator';

export class AssignProjectTeamRequestDto {
  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public actorId!: string;

  @ApiProperty({
    description:
      'Current team source. This slice expands the active primary members of the given org unit.',
  })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public teamOrgUnitId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public staffingRole!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  public allocationPercent!: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  public startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  public endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  public expectedProjectVersion?: number;
}
