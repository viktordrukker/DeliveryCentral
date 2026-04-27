import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ImportPreviewRequestDto {
  @ApiProperty({ description: 'CSV text with header row' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(800_000) // ≈800 KB of characters; comfortably under the 1 MB body-parser limit after JSON encoding. (CSV-01)
  public csvText!: string;
}
