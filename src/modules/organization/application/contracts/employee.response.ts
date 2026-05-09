import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmployeeResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty()
  public email!: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE', 'TERMINATED'] })
  public status!: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

  @ApiProperty()
  public orgUnitId!: string;

  @ApiPropertyOptional()
  public grade?: string;

  @ApiPropertyOptional()
  public role?: string;

  @ApiProperty({ type: [String] })
  public skillsets!: string[];

  // HD-8 / Chunk 8.4a — populated only after a successful deactivate.
  // Pass back to `POST /undo/:id/consume` to restore the employee.
  @ApiPropertyOptional()
  public undoActionId?: string;
}
