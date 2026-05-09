import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';

import { HelpService } from '../application/help.service';
import {
  CreateHelpFeedbackDto,
  HelpArticleDto,
  HelpFeedbackDto,
  HelpTipDto,
  OnboardingTourProgressDto,
  UpsertTourProgressDto,
} from '../application/contracts/help.dto';

const ALL_AUTHENTICATED = [
  'employee',
  'project_manager',
  'resource_manager',
  'hr_manager',
  'delivery_manager',
  'director',
  'admin',
] as const;

// HD-9 — public-facing Help Center read + feedback endpoints. The
// caller's `personId` drives feedback authorship + tour-progress
// scoping; no admin gating here. Admin write endpoints live on the
// sibling `HelpAdminController`.
@ApiTags('help')
@Controller('help')
export class HelpController {
  public constructor(private readonly help: HelpService) {}

  @Get('articles')
  @RequireRoles(...ALL_AUTHENTICATED)
  @ApiOperation({ summary: 'HD-9 — list published Help articles, optional q + tag filters.' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiOkResponse({ type: [HelpArticleDto] })
  public async listArticles(
    @Query('q') q?: string,
    @Query('tag') tag?: string,
  ): Promise<HelpArticleDto[]> {
    return this.help.listPublishedArticles({ search: q, tag });
  }

  @Get('articles/:slug')
  @RequireRoles(...ALL_AUTHENTICATED)
  @ApiOperation({ summary: 'HD-9 — get a published Help article by slug.' })
  @ApiOkResponse({ type: HelpArticleDto })
  public async getArticle(@Param('slug') slug: string): Promise<HelpArticleDto> {
    if (!slug || slug.length > 200) {
      throw new BadRequestException('slug must be 1..200 characters.');
    }
    return this.help.getArticleBySlug(slug);
  }

  @Get('tips')
  @RequireRoles(...ALL_AUTHENTICATED)
  @ApiOperation({
    summary: 'HD-9 — list active tips for a route. Drives the per-page `?` button.',
  })
  @ApiQuery({ name: 'route', required: true, type: String })
  @ApiOkResponse({ type: [HelpTipDto] })
  public async listTipsForRoute(@Query('route') routePath: string): Promise<HelpTipDto[]> {
    if (!routePath) throw new BadRequestException('route query param is required.');
    return this.help.listTipsForRoute(routePath);
  }

  @Post('articles/:id/feedback')
  @RequireRoles(...ALL_AUTHENTICATED)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'HD-9 — submit reader feedback on a Help article.' })
  @ApiOkResponse({ type: HelpFeedbackDto })
  public async submitFeedback(
    @Param('id', ParseUUIDPipe) articleId: string,
    @Body() dto: CreateHelpFeedbackDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<HelpFeedbackDto> {
    const actorId = req.principal?.personId ?? req.principal?.userId ?? null;
    return this.help.submitFeedback(articleId, actorId, dto);
  }

  @Get('onboarding/:tourKey')
  @RequireRoles(...ALL_AUTHENTICATED)
  @ApiOperation({ summary: "HD-9 — fetch the caller's progress for an onboarding tour." })
  @ApiOkResponse({ type: OnboardingTourProgressDto })
  public async getTourProgress(
    @Param('tourKey') tourKey: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<OnboardingTourProgressDto | { tourKey: string; completedSteps: string[] }> {
    const personId = req.principal?.personId;
    if (!personId) throw new BadRequestException('Authenticated personId required.');
    const existing = await this.help.getTourProgress(personId, tourKey);
    // Return a synthetic empty-progress shape when no row exists so
    // the FE can treat the response uniformly without a 404.
    return existing ?? { tourKey, completedSteps: [] };
  }

  @Put('onboarding/:tourKey')
  @RequireRoles(...ALL_AUTHENTICATED)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "HD-9 — upsert the caller's onboarding-tour progress." })
  @ApiOkResponse({ type: OnboardingTourProgressDto })
  public async upsertTourProgress(
    @Param('tourKey') tourKey: string,
    @Body() dto: UpsertTourProgressDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<OnboardingTourProgressDto> {
    const personId = req.principal?.personId;
    if (!personId) throw new BadRequestException('Authenticated personId required.');
    return this.help.upsertTourProgress(personId, tourKey, dto);
  }
}
