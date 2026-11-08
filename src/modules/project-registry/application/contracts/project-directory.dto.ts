import { ApiProperty } from '@nestjs/swagger';

export class ProjectExternalLinkSummaryDto {
  @ApiProperty()
  public provider!: string;

  @ApiProperty()
  public count!: number;
}

export class ProjectExternalLinkDto {
  @ApiProperty()
  public provider!: string;

  @ApiProperty()
  public externalProjectKey!: string;

  @ApiProperty()
  public externalProjectName!: string;

  @ApiProperty({ required: false, nullable: true })
  public externalUrl!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public providerEnvironment!: string | null;

  @ApiProperty()
  public archived!: boolean;
}

export type ProjectBudgetStatus = 'GREEN' | 'YELLOW' | 'RED' | 'UNSET';

export class ProjectDirectoryItemDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public name!: string;

  @ApiProperty()
  public projectCode!: string;

  @ApiProperty()
  public status!: string;

  @ApiProperty()
  public version!: number;

  @ApiProperty()
  public assignmentCount!: number;

  @ApiProperty()
  public externalLinksCount!: number;

  @ApiProperty({ type: [ProjectExternalLinkSummaryDto] })
  public externalLinksSummary!: ProjectExternalLinkSummaryDto[];

  @ApiProperty({ required: false, nullable: true })
  public engagementModel!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public priority!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public clientName!: string | null;

  /**
   * W2-07 — Cost Performance Index (EV / AC) from the latest ProjectBudget
   * row. `null` when no budget exists, or actualCost ≤ 0, or earnedValue is
   * not recorded. Mirrors the radiator-signal-collector computation.
   */
  @ApiProperty({ required: false, nullable: true })
  public cpi!: number | null;

  /**
   * W2-07 — derived budget health: GREEN when projected EAC ≤ 85 % of BAC;
   * YELLOW when 85 % < EAC ≤ 100 %; RED when EAC > BAC; UNSET when no
   * budget has been entered. Matches the financial-service health-color
   * thresholds.
   */
  @ApiProperty({ required: false, nullable: true, enum: ['GREEN', 'YELLOW', 'RED', 'UNSET'] })
  public budgetStatus!: ProjectBudgetStatus;

  /**
   * W2-07 — count of ProjectPosition rows on the project whose `fillStatus`
   * is `OPEN`. The "demand still on the market" number; used in MoneyTab
   * and ProjectDirectoryInspector.
   */
  @ApiProperty()
  public openPositionsCount!: number;
}

export class ProjectDirectoryResponseDto {
  @ApiProperty({ type: [ProjectDirectoryItemDto] })
  public items!: ProjectDirectoryItemDto[];

  @ApiProperty({ description: 'Total number of items matching the filter, before pagination is applied.' })
  public totalCount!: number;
}

export class ProjectDetailsDto extends ProjectDirectoryItemDto {
  @ApiProperty({ required: false, nullable: true })
  public description!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public startDate!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public plannedEndDate!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public projectManagerId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public projectManagerDisplayName!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public deliveryManagerId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public deliveryManagerDisplayName!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public clientId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public domain!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public projectType!: string | null;

  @ApiProperty({ required: false, nullable: true })
  public techStack!: string[];

  @ApiProperty({ required: false, nullable: true })
  public tags!: string[];

  @ApiProperty({ type: [ProjectExternalLinkDto] })
  public externalLinks!: ProjectExternalLinkDto[];

  @ApiProperty({ required: false, nullable: true, enum: ['SMALL', 'STANDARD', 'ENTERPRISE', 'PROGRAM'] })
  public shape?: 'SMALL' | 'STANDARD' | 'ENTERPRISE' | 'PROGRAM' | null;

  @ApiProperty({ required: false })
  public hasLiveSpcRates?: boolean;
}
