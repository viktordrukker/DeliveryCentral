import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  
  Max,
  Min,
  
  
  Matches,
} from 'class-validator';

export class SkillDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public name!: string;

  @ApiPropertyOptional({ nullable: true })
  public category?: string | null;

  @ApiProperty()
  public createdAt!: string;
}

export class CreateSkillDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  public category?: string;
}

export class PersonSkillDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public skillId!: string;

  @ApiProperty()
  public skillName!: string;

  @ApiPropertyOptional({ nullable: true })
  public skillCategory?: string | null;

  @ApiProperty()
  public proficiency!: number;

  @ApiProperty()
  public certified!: boolean;

  @ApiProperty()
  public updatedAt!: string;
}

export class UpsertPersonSkillItemDto {
  @ApiProperty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public skillId!: string;

  @ApiProperty({ minimum: 1, maximum: 4 })
  @IsNumber()
  @Min(1)
  @Max(4)
  public proficiency!: number;

  @ApiProperty()
  @IsBoolean()
  public certified!: boolean;
}

export class SkillMatchCandidateDto {
  @ApiProperty()
  public personId!: string;

  @ApiProperty()
  public displayName!: string;

  @ApiProperty({ type: [String] })
  public matchedSkills!: string[];

  @ApiProperty()
  public currentAllocation!: number;
}
