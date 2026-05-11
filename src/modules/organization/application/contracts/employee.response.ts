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

  /**
   * @deprecated Sprint F-0.5 (B-03 closure) — superseded by `PersonSkill` rows
   * fetchable via `GET /api/people/:id/skills`. Full removal is a v1.1+ ratchet.
   */
  @ApiProperty({
    type: [String],
    deprecated: true,
    description: 'Deprecated. Use GET /api/people/:id/skills for canonical PersonSkill rows.',
  })
  public skillsets!: string[];

  // HD-8 / Chunk 8.4a — populated only after a successful deactivate.
  // Pass back to `POST /undo/:id/consume` to restore the employee.
  @ApiPropertyOptional()
  public undoActionId?: string;
}
