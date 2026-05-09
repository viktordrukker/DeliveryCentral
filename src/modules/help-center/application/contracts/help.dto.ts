import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

// HD-9 — DTOs for the Help Center MVP (J11). Shared between the
// read controller (public) and the admin write controller.

export class HelpArticleDto {
  id!: string;
  slug!: string;
  title!: string;
  summary!: string;
  body!: string;
  tags!: string[];
  isPublished!: boolean;
  authorPersonId!: string | null;
  authorDisplayName!: string | null;
  createdAt!: string;
  updatedAt!: string;
}

export class HelpTipDto {
  id!: string;
  key!: string;
  routePath!: string;
  title!: string;
  body!: string;
  articleId!: string | null;
  displayOrder!: number;
}

export class HelpFeedbackDto {
  id!: string;
  articleId!: string;
  actorPersonId!: string | null;
  wasHelpful!: boolean;
  comment!: string | null;
  createdAt!: string;
}

export class OnboardingTourProgressDto {
  personId!: string;
  tourKey!: string;
  completedSteps!: string[];
  dismissedAt!: string | null;
  completedAt!: string | null;
  updatedAt!: string;
}

// ── Write DTOs ───────────────────────────────────────────────────

export class CreateHelpArticleDto {
  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  summary!: string;

  @ApiProperty()
  @IsString()
  body!: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class UpdateHelpArticleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  archive?: boolean;
}

export class CreateHelpFeedbackDto {
  @ApiProperty()
  @IsBoolean()
  wasHelpful!: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpsertTourProgressDto {
  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  completedSteps?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  dismissed?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}

export class CreateHelpTipDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  routePath!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  body!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  articleId?: string;
}
