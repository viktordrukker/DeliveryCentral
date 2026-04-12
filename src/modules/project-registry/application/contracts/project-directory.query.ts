import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectDirectoryQueryDto {
  @ApiPropertyOptional()
  public source?: string;
}
