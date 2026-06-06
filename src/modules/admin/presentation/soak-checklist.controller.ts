import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';

import {
  type SoakCellObservation,
  type SoakChecklistCell,
  type SoakChecklistState,
  type SoakChecklistSummary,
  SoakChecklistService,
} from '../application/soak-checklist.service';

const ALLOWED_OBSERVATIONS: readonly SoakCellObservation[] = [
  'PASS',
  'FAIL',
  'BLOCKED',
  'NOT_RUN',
];

interface UpsertCellsRequest {
  cells: SoakChecklistCell[];
  expected?: Record<string, Record<string, string>>;
}

interface SoakChecklistResponse {
  state: SoakChecklistState;
  summary?: SoakChecklistSummary;
}

/**
 * MANUAL-CLICK-THROUGH-30 — admin checklist controller.
 *
 * Stores QA observations of the 30 journey x 8 role click-through matrix
 * that gates the C0 cutover (dsRefresh + workspaceMe default flip). All
 * routes are admin-only and observation-only — flipping the cutover flags
 * is a separate operation handled by the LEAN soak monitor.
 */
@ApiTags('admin/v2-soak')
@Controller('admin/v2-soak/checklist')
export class SoakChecklistController {
  public constructor(private readonly checklist: SoakChecklistService) {}

  @Get(':sessionId')
  @RequireRoles('admin')
  @ApiOperation({
    summary:
      'MANUAL-CLICK-THROUGH-30 — read the saved observation matrix for a soak session. Returns an empty state if the session does not exist yet.',
  })
  @ApiOkResponse({ description: 'Saved checklist state.' })
  public async get(
    @Param('sessionId') sessionId: string,
  ): Promise<SoakChecklistResponse> {
    this.assertSessionId(sessionId);
    const state =
      (await this.checklist.load(sessionId)) ?? this.empty(sessionId);
    return { state };
  }

  @Put(':sessionId')
  @RequireRoles('admin')
  @ApiOperation({
    summary:
      'MANUAL-CLICK-THROUGH-30 — upsert observations for the soak session. Pass `expected` to receive a live exit-gate summary alongside the saved state.',
  })
  @ApiOkResponse({ description: 'Saved checklist state plus optional summary.' })
  public async put(
    @Param('sessionId') sessionId: string,
    @Body() body: UpsertCellsRequest,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<SoakChecklistResponse> {
    this.assertSessionId(sessionId);
    if (!body || !Array.isArray(body.cells)) {
      throw new BadRequestException('Body must include a `cells` array.');
    }
    for (const cell of body.cells) {
      if (typeof cell.journeyId !== 'string' || !cell.journeyId) {
        throw new BadRequestException('Each cell needs a non-empty journeyId.');
      }
      if (typeof cell.role !== 'string' || !cell.role) {
        throw new BadRequestException('Each cell needs a non-empty role.');
      }
      if (!ALLOWED_OBSERVATIONS.includes(cell.observation)) {
        throw new BadRequestException(
          `Invalid observation "${cell.observation}". Allowed: ${ALLOWED_OBSERVATIONS.join(', ')}.`,
        );
      }
      if (cell.note !== undefined && typeof cell.note !== 'string') {
        throw new BadRequestException('Cell `note` must be a string when present.');
      }
      if (typeof cell.observedAt !== 'string') {
        throw new BadRequestException('Each cell needs an observedAt timestamp.');
      }
    }

    const actorId = req.principal?.personId ?? req.principal?.userId ?? undefined;
    const state = await this.checklist.upsert(sessionId, body.cells, actorId);
    const summary = body.expected
      ? this.checklist.summarise(state, body.expected)
      : undefined;
    return { state, summary };
  }

  private empty(sessionId: string): SoakChecklistState {
    const now = new Date().toISOString();
    return { sessionId, startedAt: now, updatedAt: now, cells: [] };
  }

  private assertSessionId(sessionId: string): void {
    try {
      this.checklist.assertSessionId(sessionId);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }
}
