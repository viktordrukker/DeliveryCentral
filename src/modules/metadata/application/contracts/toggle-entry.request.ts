import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleEntryRequestDto {
  @ApiProperty()
  @IsBoolean()
  public isEnabled!: boolean;
}
