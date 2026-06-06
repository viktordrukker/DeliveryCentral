import { BadRequestException, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import {
  IntegrationProvider,
  IntegrationRegistryEntry,
  IntegrationTestConnectionResult,
  IntegrationsRegistryService,
} from '../application/integrations-registry.service';

/**
 * F-8.1 / NEW C1-INT-FRAMEWORK — uniform admin view of every adapter.
 * Pairs with the FE `IntegrationsRegistryPage` at `/admin/integrations/registry`.
 *
 * W2-10 adds parity test-connection probes for JSM + LDAP + LLM at
 * `POST /admin/integrations/registry/:provider/test-connection`, alongside
 * the per-provider remediation endpoints on the legacy controllers
 * (Jira/M365/RADIUS).
 */
@ApiTags('admin/integrations-registry')
@Controller('admin/integrations/registry')
export class IntegrationsRegistryAdminController {
  public constructor(private readonly registry: IntegrationsRegistryService) {}

  @Get()
  @RequireRoles('admin')
  @ApiOperation({
    summary:
      'Uniform registry of every integration adapter (Jira, M365, Radius, JSM, LDAP, LLM) with status, last-sync, and manual-sync flag.',
  })
  @ApiOkResponse({ description: 'Array of IntegrationRegistryEntry.' })
  public list(): Promise<IntegrationRegistryEntry[]> {
    return this.registry.list();
  }

  @Post(':provider/test-connection')
  @RequireRoles('admin')
  @ApiOperation({
    summary:
      'Probe a registry-managed adapter (jsm / ldap / llm) without mutating data. Returns reachability + latency.',
  })
  @ApiOkResponse({ description: 'IntegrationTestConnectionResult' })
  public async testConnection(
    @Param('provider') provider: string,
  ): Promise<IntegrationTestConnectionResult> {
    const normalized = provider.toLowerCase() as IntegrationProvider;
    if (!['jsm', 'ldap', 'llm'].includes(normalized)) {
      throw new BadRequestException(
        `Provider ${provider} is not a registry-probe target. Use the legacy controllers for jira/m365/radius.`,
      );
    }
    return this.registry.testConnection(normalized);
  }
}
