import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@src/modules/identity-access/application/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
@Public()
export class HealthController {
  public constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'Service is alive.' })
  public async getHealth(): Promise<{
    diagnosticsPath: string;
    environment: string;
    service: string;
    status: string;
    timestamp: string;
  }> {
    return this.healthService.getHealth();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiOkResponse({ description: 'Service is ready.' })
  public async getReadiness(): Promise<{
    checks: Array<{ name: string; status: 'degraded' | 'ready'; summary: string }>;
    status: 'degraded' | 'ready';
    timestamp: string;
  }> {
    return this.healthService.getReadiness();
  }

  @Get('diagnostics')
  @ApiOperation({ summary: 'Operational diagnostics surface' })
  @ApiOkResponse({ description: 'Operational diagnostics summary.' })
  public async getDiagnostics(): Promise<unknown> {
    return this.healthService.getDiagnostics();
  }
}
