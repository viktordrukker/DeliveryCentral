import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class UpdateSlaConfigRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  public caseType!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  public hours!: number;
}
