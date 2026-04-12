import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AbacPolicyRegistry } from './application/abac/abac-policy.registry';
import { AuthenticatedPrincipalFactory } from './application/authenticated-principal.factory';
import { DemoModeGuard } from './application/demo-mode.guard';
import { RbacGuard } from './application/rbac.guard';

@Global()
@Module({
  providers: [
    AuthenticatedPrincipalFactory,
    AbacPolicyRegistry,
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
    {
      provide: APP_GUARD,
      useClass: DemoModeGuard,
    },
  ],
  exports: [AuthenticatedPrincipalFactory, AbacPolicyRegistry],
})
export class IdentityAccessModule {}
