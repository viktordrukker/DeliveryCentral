import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class WorkspendBucketDto {
  @ApiProperty()
  public key!: string;

  @ApiProperty()
  public mandays!: number;
}

class ProjectWorkspendSummaryDto {
  @ApiProperty()
  public totalMandays!: number;

  @ApiProperty({ type: [WorkspendBucketDto] })
  public byRole!: WorkspendBucketDto[];

  @ApiProperty({ type: [WorkspendBucketDto] })
  public bySkillset!: WorkspendBucketDto[];
}

export class ProjectClosureResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty()
  public status!: string;

  @ApiProperty()
  public version!: number;

  @ApiProperty({ type: ProjectWorkspendSummaryDto })
  public workspend!: ProjectWorkspendSummaryDto;

  // HD-8 / Chunk 8.4a — populated only after a successful, non-override
  // close. Pass back to `POST /undo/:id/consume` to reopen the project.
  @ApiPropertyOptional()
  public undoActionId?: string;
}
