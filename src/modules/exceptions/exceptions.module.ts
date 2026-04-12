import { Module, forwardRef } from '@nestjs/common';

import { AssignmentsModule } from '../assignments/assignments.module';
import { M365Module } from '../integrations/m365/m365.module';
import { RadiusModule } from '../integrations/radius/radius.module';
import { OrganizationModule } from '../organization/organization.module';
import { ProjectRegistryModule } from '../project-registry/project-registry.module';
import { WorkEvidenceModule } from '../work-evidence/work-evidence.module';
import { ExceptionResolutionStore } from './domain/exception-resolution.store';
import { ExceptionQueueQueryService } from './application/exception-queue-query.service';
import { ResolveExceptionService } from './application/resolve-exception.service';
import { SuppressExceptionService } from './application/suppress-exception.service';
import { ExceptionsController } from './presentation/exceptions.controller';

@Module({
  imports: [
    forwardRef(() => AssignmentsModule),
    M365Module,
    forwardRef(() => OrganizationModule),
    forwardRef(() => ProjectRegistryModule),
    RadiusModule,
    WorkEvidenceModule,
  ],
  controllers: [ExceptionsController],
  providers: [
    {
      provide: ExceptionResolutionStore,
      useValue: new ExceptionResolutionStore(),
    },
    ExceptionQueueQueryService,
    {
      provide: ResolveExceptionService,
      useFactory: (
        store: ExceptionResolutionStore,
        queryService: ExceptionQueueQueryService,
      ) => new ResolveExceptionService(store, queryService),
      inject: [ExceptionResolutionStore, ExceptionQueueQueryService],
    },
    {
      provide: SuppressExceptionService,
      useFactory: (
        store: ExceptionResolutionStore,
        queryService: ExceptionQueueQueryService,
      ) => new SuppressExceptionService(store, queryService),
      inject: [ExceptionResolutionStore, ExceptionQueueQueryService],
    },
  ],
  exports: [ExceptionQueueQueryService, ResolveExceptionService, SuppressExceptionService],
})
export class ExceptionsModule {}
