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
}
