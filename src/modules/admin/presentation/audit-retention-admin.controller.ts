import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditRetentionSweepService } from '@src/modules/audit-observability/application/audit-retention-sweep.service';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

/**
 * F-5.6 / D-168 — manual trigger for the audit retention sweep.
 *
 * The sweep also runs automatically every `audit.sweep.intervalHours`
 * (default 24); this endpoint lets ops force a run for testing or
 * after raising/lowering `audit.retentionDays`.
 */
@ApiTags('admin/audit-retention')
@Controller('admin/audit-retention')
export class AuditRetentionAdminController {
  public constructor(private readonly sweep: AuditRetentionSweepService) {}

  @Post('sweep')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({
    summary:
      'F-5.6 / D-168 — manually trigger an audit-retention sweep. Returns the cutoff timestamp and the number of rows deleted.',
  })
  @ApiOkResponse({ description: 'Sweep result.' })
  public async runSweep(): Promise<{ deleted: number; cutoff: string }> {
    return this.sweep.sweep();
  }
}
