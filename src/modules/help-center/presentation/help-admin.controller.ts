import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';

import { HelpService } from '../application/help.service';
import {
  CreateHelpArticleDto,
  CreateHelpTipDto,
  HelpArticleDto,
  HelpTipDto,
  UpdateHelpArticleDto,
} from '../application/contracts/help.dto';

// HD-9 — admin write endpoints. Same module as the read controller but
// gated to `admin` only. Article create + update + archive plus the
// (rarely-touched) tip create live here. Tip update + bulk operations
// land in a later chunk if/when the admin UI needs them.
@ApiTags('help-admin')
@Controller('admin/help')
export class HelpAdminController {
  public constructor(private readonly help: HelpService) {}

  @Get('articles')
  @RequireRoles('admin')
  @ApiOperation({
    summary: 'HD-9 — admin-only list of Help articles (drafts + archived included).',
  })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiOkResponse({ type: [HelpArticleDto] })
  public listArticles(
    @Query('q') q?: string,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<HelpArticleDto[]> {
    return this.help.listAllArticlesForAdmin({
      search: q,
      includeArchived: includeArchived === 'true',
    });
  }

  @Get('articles/:id')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'HD-9 — admin-only fetch of a Help article by id (any status).' })
  @ApiOkResponse({ type: HelpArticleDto })
  public getArticleById(@Param('id', ParseUUIDPipe) id: string): Promise<HelpArticleDto> {
    return this.help.getArticleByIdForAdmin(id);
  }

  @Post('articles')
  @RequireRoles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'HD-9 — create a Help article (admin).' })
  @ApiCreatedResponse({ type: HelpArticleDto })
  public async createArticle(
    @Body() dto: CreateHelpArticleDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<HelpArticleDto> {
    const actorId = req.principal?.personId ?? null;
    return this.help.createArticle(actorId, dto);
  }

  @Patch('articles/:id')
  @RequireRoles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'HD-9 — update a Help article (admin). Set archive=true to soft-delete.' })
  @ApiOkResponse({ type: HelpArticleDto })
  public async updateArticle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHelpArticleDto,
  ): Promise<HelpArticleDto> {
    return this.help.updateArticle(id, dto);
  }

  @Post('tips')
  @RequireRoles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'HD-9 — create a route-pinned Help tip (admin).' })
  @ApiCreatedResponse({ type: HelpTipDto })
  public async createTip(@Body() dto: CreateHelpTipDto): Promise<HelpTipDto> {
    return this.help.createTip(dto);
  }
}
