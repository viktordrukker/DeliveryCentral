import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import {
  LeanMigrationParityService,
  type LeanMigrationParitySnapshot,
} from '../application/lean-migration-parity.service';

/**
 * LEAN-P2-9 — soak monitor endpoint.
 *
 * Admin-only `GET /api/admin/lean-migration/parity` returns the daily
 * parity snapshot consumed by `scripts/lean-migration-soak-monitor.ts`
 * and the C0 exit checklist. This endpoint does NOT flip any feature
 * flag — it is observation-only.
 */
@ApiTags('admin/lean-migration')
@Controller('admin/lean-migration')
export class LeanMigrationParityController {
  public constructor(private readonly parity: LeanMigrationParityService) {}

  @Get('parity')
  @RequireRoles('admin')
  @ApiOperation({
    summary:
      'LEAN-P2-9 — snapshot of ProjectPosition / ProjectAssignment / StaffingRequest parity counts used during the dsRefresh staging soak.',
  })
  @ApiOkResponse({ description: 'Single parity snapshot.' })
  public snapshot(): Promise<LeanMigrationParitySnapshot> {
    return this.parity.snapshot();
  }
}
