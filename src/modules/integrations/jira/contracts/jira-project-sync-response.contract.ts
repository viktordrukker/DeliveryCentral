import { ApiProperty } from '@nestjs/swagger';

export class JiraProjectSyncResponseDto {
  @ApiProperty()
  public projectsCreated!: number;

  @ApiProperty()
  public projectsUpdated!: number;

  @ApiProperty({ type: [String] })
  public syncedProjectIds!: string[];
}
