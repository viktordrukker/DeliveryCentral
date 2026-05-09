import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { MetricsService } from './metrics.service';

// HD-11 — `/metrics` Prometheus exposition endpoint. Admin-gated since
// it leaks internal counters that could be useful to an attacker
// (e.g., publisher backlog → "is this tenant under load right now").
// In a production deployment a Prometheus scraper would talk to this
// endpoint with an admin-scoped service token; we deliberately do
// NOT make it `@Public()` so a casual GET on a misconfigured ingress
// can't enumerate the metric series.
@ApiTags('observability')
@Controller('metrics')
export class MetricsController {
  public constructor(private readonly metrics: MetricsService) {}

  @Get()
  @RequireRoles('admin')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({
    summary: 'Prometheus exposition format. HD-11 / F8.1.',
  })
  public async expose(@Res() res: Response): Promise<void> {
    const body = await this.metrics.registry.metrics();
    res.send(body);
  }
}
