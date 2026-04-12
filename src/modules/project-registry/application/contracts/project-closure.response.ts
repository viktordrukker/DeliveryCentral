import { ApiProperty } from '@nestjs/swagger';

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
}
