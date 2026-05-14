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
import { Idempotent } from '@src/shared/http/idempotent.decorator';

import {
  RedactPersonAuditService,
  type RedactPersonResult,
} from '../application/redact-person-audit.service';

/**
 * F-5.5 / D-167 v1 — POST /admin/persons/:id/forget.
 *
 * GDPR Article 17 right-to-erasure for AuditLog rows that reference the
 * forgotten person. Redacts `payload.email` and `payload.actorDisplayName`
 * across every matching row, then rebuilds the hash chain forward so
 * the existing verifier (`scripts/verify-audit-hash-chain.cjs`) still
 * passes.
 *
 * Admin-only. Idempotent — repeating the call on an already-forgotten
 * person is a no-op (subsequent calls find 0 candidate rows because
 * the literal '[redacted]' values are excluded by the WHERE clause).
 */
@ApiTags('admin/persons')
@Controller('admin/persons')
export class RedactPersonAdminController {
  public constructor(private readonly redactor: RedactPersonAuditService) {}

  @Post(':id/forget')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @Idempotent()
  @ApiOperation({
    summary:
      'F-5.5 / D-167 v1 — redact email + actorDisplayName from AuditLog rows that reference the person, then rebuild the hash chain forward.',
  })
  @ApiOkResponse({ description: 'Redaction summary.' })
  public async forget(
    @Param('id', ParseUUIDPipe) personId: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<RedactPersonResult> {
    const actorId = req.principal?.personId ?? req.principal?.userId ?? null;
    if (!actorId) {
      throw new BadRequestException('Admin actor identity missing on the request.');
    }
    return this.redactor.redact(personId, actorId);
  }
}
