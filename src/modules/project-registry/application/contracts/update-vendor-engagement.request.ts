import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateVendorEngagementRequestDto {
  @ApiPropertyOptional({ enum: ['COMPLETED', 'TERMINATED'] })
  @IsOptional()
  @IsString()
  @IsIn(['COMPLETED', 'TERMINATED'])
  public status?: 'COMPLETED' | 'TERMINATED';
}
