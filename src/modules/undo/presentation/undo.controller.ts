import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { ALL_AUTHENTICATED_ROLES } from '@src/shared/auth/role-presets';
import { Idempotent } from '@src/shared/http/idempotent.decorator';

import { UndoConsumeResponseDto } from '../application/contracts/undo.dto';
import { UndoService } from '../application/undo.service';

// HD-8 / Chunk 8.2 — undo consume endpoint. Idempotency comes from
// `UndoService.consume` (re-returns the same result on already-
// consumed rows) and ALSO from the `@Idempotent()` interceptor (HD-0.4
// era), which lets the FE retry the same Idempotency-Key safely if the
// network call drops mid-flight.
@ApiTags('undo')
@Controller('undo')
export class UndoController {
  public constructor(private readonly undoService: UndoService) {}

  @Post(':id/consume')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @Idempotent()
  @ApiOperation({
    summary:
      'HD-8 — consume an undo token, reversing the original action via the registered executor.',
  })
  @ApiOkResponse({ type: UndoConsumeResponseDto })
  public async consume(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<UndoConsumeResponseDto> {
    const actorId = req.principal?.personId;
    if (!actorId) {
      throw new BadRequestException('Authenticated personId required.');
    }
    const result = await this.undoService.consume(id, actorId);
    return {
      undoActionId: result.undoActionId,
      actionType: result.actionType,
      entityId: result.entityId,
      consumedAt: result.consumedAt.toISOString(),
    };
  }
}
