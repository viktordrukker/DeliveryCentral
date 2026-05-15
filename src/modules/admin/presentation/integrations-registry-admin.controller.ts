import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import {
  IntegrationRegistryEntry,
  IntegrationsRegistryService,
} from '../application/integrations-registry.service';

/**
 * F-8.1 / NEW C1-INT-FRAMEWORK — uniform admin view of every adapter.
 * Pairs with the FE `IntegrationsRegistryPage` at `/admin/integrations/registry`.
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
}
