import { ApiProperty } from '@nestjs/swagger';

import { PersonDirectoryItemDto } from './person-directory.dto';

export class ManagerScopeResponseDto {
  @ApiProperty()
  public managerId!: string;

  @ApiProperty({ type: [PersonDirectoryItemDto] })
  public directReports!: PersonDirectoryItemDto[];

  @ApiProperty({ type: [PersonDirectoryItemDto] })
  public dottedLinePeople!: PersonDirectoryItemDto[];

  @ApiProperty()
  public page!: number;

  @ApiProperty()
  public pageSize!: number;

  @ApiProperty()
  public totalDirectReports!: number;

  @ApiProperty()
  public totalDottedLinePeople!: number;
}
