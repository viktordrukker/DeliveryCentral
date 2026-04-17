import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ImportPreviewRequestDto {
  @ApiProperty({ description: 'CSV text with header row' })
  @IsString()
  @IsNotEmpty()
  public csvText!: string;
}
