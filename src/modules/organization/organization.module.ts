import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AuditLoggerService } from '../audit-observability/application/audit-logger.service';
import { CaseManagementModule } from '../case-management/case-management.module';
import { CreateCaseService } from '../case-management/application/create-case.service';
import { CaseTypeKey } from '../case-management/domain/entities/case-type.entity';
import { ResponsibilityResolverService } from '../identity-access/application/responsibility-resolver.service';
import { AssignmentsModule } from '../assignments/assignments.module';
import { NotificationEventTranslatorService } from '../notifications/application/notification-event-translator.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EndProjectAssignmentService } from '../assignments/application/end-project-assignment.service';
import { InMemoryProjectAssignmentRepository } from '../assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { ProjectRegistryModule } from '../project-registry/project-registry.module';
import { InMemoryProjectRepository } from '../project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { WorkEvidenceModule } from '../work-evidence/work-evidence.module';
import { InMemoryWorkEvidenceRepository } from '../work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { AppConfig } from '@src/shared/config/app-config';
import { AssignLineManagerService } from './application/assign-line-manager.service';
import { TerminateReportingLineService } from './application/terminate-reporting-line.service';
import { CreateTeamService } from './application/create-team.service';
import { CreateEmployeeService } from './application/create-employee.service';
import { DeactivateEmployeeService } from './application/deactivate-employee.service';
import { PersonDeactivateUndoExecutor } from './application/person-deactivate-undo.executor';
import { UndoActionExecutorRegistry } from '@src/modules/undo/application/undo-action-executor.registry';
import { UndoService } from '@src/modules/undo/application/undo.service';
import { DecidePersonReleaseService } from './application/decide-person-release.service';
import { EmployeeActivityService } from './application/employee-activity.service';
import { OpenPersonReleaseRequestService } from './application/open-person-release-request.service';
import { TerminateEmployeeService } from './application/terminate-employee.service';
import { ManagerScopeQueryService } from './application/manager-scope-query.service';
import { OrgChartQueryService } from './application/org-chart-query.service';
import { PersonDirectoryQueryService } from './application/person-directory-query.service';
import { TeamQueryService } from './application/team-query.service';
import { TeamStorePort } from './application/team-store.port';
import { UpdateTeamMemberService } from './application/update-team-member.service';
import { InMemoryOrgUnitRepository } from './infrastructure/repositories/in-memory/in-memory-org-unit.repository';
import { InMemoryPersonOrgMembershipRepository } from './infrastructure/repositories/in-memory/in-memory-person-org-membership.repository';
import { InMemoryPersonRepository } from './infrastructure/repositories/in-memory/in-memory-person.repository';
import { InMemoryReportingLineRepository } from './infrastructure/repositories/in-memory/in-memory-reporting-line.repository';
import { PrismaOrgUnitRepository } from './infrastructure/repositories/prisma/prisma-org-unit.repository';
import { PrismaPersonOrgMembershipRepository } from './infrastructure/repositories/prisma/prisma-person-org-membership.repository';
import { PrismaPersonRepository } from './infrastructure/repositories/prisma/prisma-person.repository';
import { PrismaReportingLineRepository } from './infrastructure/repositories/prisma/prisma-reporting-line.repository';
import { PrismaTeamStore } from './infrastructure/repositories/prisma/prisma-team.store';
import { PrismaPersonDirectoryQueryRepository } from './infrastructure/queries/prisma-person-directory-query.repository';
import { ManagerScopeController } from './presentation/manager-scope.controller';
import { OrgChartController } from './presentation/org-chart.controller';
import { PersonDirectoryController } from './presentation/person-directory.controller';
import { PersonReleaseRequestController } from './presentation/person-release-request.controller';
import { ReportingLinesController } from './presentation/reporting-lines.controller';
import { TeamsController } from './presentation/teams.controller';

@Module({
  imports: [
    forwardRef(() => AssignmentsModule),
    forwardRef(() => ProjectRegistryModule),
    WorkEvidenceModule,
    NotificationsModule,
    CaseManagementModule,
  ],
  controllers: [
    PersonDirectoryController,
    ManagerScopeController,
    OrgChartController,
    PersonReleaseRequestController,
    ReportingLinesController,
    TeamsController,
  ],
  providers: [
    {
      provide: TeamStorePort,
      useFactory: (prisma: PrismaService) => new PrismaTeamStore(prisma),
      inject: [PrismaService],
    },
    {
      provide: InMemoryPersonRepository,
      useFactory: (prisma: PrismaService) => new PrismaPersonRepository(prisma.person),
      inject: [PrismaService],
    },
    {
      provide: InMemoryOrgUnitRepository,
      useFactory: (prisma: PrismaService) => new PrismaOrgUnitRepository(prisma.orgUnit),
      inject: [PrismaService],
    },
    {
      provide: InMemoryPersonOrgMembershipRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaPersonOrgMembershipRepository(prisma.personOrgMembership),
      inject: [PrismaService],
    },
    {
      provide: InMemoryReportingLineRepository,
      useFactory: (prisma: PrismaService) => new PrismaReportingLineRepository(prisma.reportingLine),
      inject: [PrismaService],
    },
    PrismaPersonDirectoryQueryRepository,
    {
      provide: PersonDirectoryQueryService,
      useFactory: (repository: PrismaPersonDirectoryQueryRepository) =>
        new PersonDirectoryQueryService(repository),
      inject: [PrismaPersonDirectoryQueryRepository],
    },
    {
      provide: ManagerScopeQueryService,
      useFactory: (repository: PrismaPersonDirectoryQueryRepository) =>
        new ManagerScopeQueryService(repository),
      inject: [PrismaPersonDirectoryQueryRepository],
    },
    {
      provide: OrgChartQueryService,
      useFactory: (
        personRepository: InMemoryPersonRepository,
        orgUnitRepository: InMemoryOrgUnitRepository,
        personOrgMembershipRepository: InMemoryPersonOrgMembershipRepository,
        reportingLineRepository: InMemoryReportingLineRepository,
      ) =>
        new OrgChartQueryService(
          personRepository,
          orgUnitRepository,
          personOrgMembershipRepository,
          reportingLineRepository,
        ),
      inject: [
        InMemoryPersonRepository,
        InMemoryOrgUnitRepository,
        InMemoryPersonOrgMembershipRepository,
        InMemoryReportingLineRepository,
      ],
    },
    {
      provide: TeamQueryService,
      useFactory: (
        personDirectoryQueryService: PersonDirectoryQueryService,
        teamStore: TeamStorePort,
        orgUnitRepository: InMemoryOrgUnitRepository,
        projectAssignmentRepository: InMemoryProjectAssignmentRepository,
        projectRepository: InMemoryProjectRepository,
        workEvidenceRepository: InMemoryWorkEvidenceRepository,
        appConfig: AppConfig,
      ) =>
        new TeamQueryService(
          personDirectoryQueryService,
          teamStore,
          orgUnitRepository,
          projectAssignmentRepository,
          projectRepository,
          workEvidenceRepository,
          appConfig,
        ),
      inject: [
        PersonDirectoryQueryService,
        TeamStorePort,
        InMemoryOrgUnitRepository,
        InMemoryProjectAssignmentRepository,
        InMemoryProjectRepository,
        InMemoryWorkEvidenceRepository,
        AppConfig,
      ],
    },
    {
      provide: CreateTeamService,
      useFactory: (teamStore: TeamStorePort, auditLogger: AuditLoggerService) =>
        new CreateTeamService(teamStore, auditLogger),
      inject: [TeamStorePort, AuditLoggerService],
    },
    {
      provide: UpdateTeamMemberService,
      useFactory: (
        teamStore: TeamStorePort,
        personRepository: InMemoryPersonRepository,
        auditLogger: AuditLoggerService,
      ) => new UpdateTeamMemberService(teamStore, personRepository, auditLogger),
      inject: [TeamStorePort, InMemoryPersonRepository, AuditLoggerService],
    },
    {
      provide: CreateEmployeeService,
      useFactory: (
        personRepository: InMemoryPersonRepository,
        orgUnitRepository: InMemoryOrgUnitRepository,
        personOrgMembershipRepository: InMemoryPersonOrgMembershipRepository,
        prisma: PrismaService,
        auditLogger: AuditLoggerService,
        employeeActivityService: EmployeeActivityService,
        createCaseService: CreateCaseService,
      ) =>
        new CreateEmployeeService(
          personRepository,
          orgUnitRepository,
          personOrgMembershipRepository,
          prisma,
          auditLogger,
          // Sprint F-0.3.e — wired so HIRED activity events fire on Person create
          // (was undefined → silent no-op; root of D-47 / Phase 4 walker observation
          // "History tab empty after hire").
          employeeActivityService,
          // Sprint F-0.3.e — wired so onboarding cases auto-create on Person create
          // (was undefined → silent no-op; root of 20b-08 not landing).
          (cmd) =>
            createCaseService.execute({
              caseTypeKey: cmd.caseTypeKey as CaseTypeKey,
              ownerPersonId: cmd.ownerPersonId,
              subjectPersonId: cmd.subjectPersonId,
              summary: cmd.summary,
            }),
        ),
      inject: [
        InMemoryPersonRepository,
        InMemoryOrgUnitRepository,
        InMemoryPersonOrgMembershipRepository,
        PrismaService,
        AuditLoggerService,
        EmployeeActivityService,
        CreateCaseService,
      ],
    },
    {
      provide: DeactivateEmployeeService,
      useFactory: (
        personRepository: InMemoryPersonRepository,
        auditLogger: AuditLoggerService,
        undoService: UndoService,
        employeeActivityService: EmployeeActivityService,
        createCaseService: CreateCaseService,
      ) =>
        new DeactivateEmployeeService(
          personRepository,
          auditLogger,
          // Sprint F-0.4 — wired (was `undefined`, silent on deactivate).
          employeeActivityService,
          // Sprint F-0.4 — wired so OFFBOARDING cases auto-create on deactivate.
          (cmd) =>
            createCaseService.execute({
              caseTypeKey: cmd.caseTypeKey as CaseTypeKey,
              ownerPersonId: cmd.ownerPersonId,
              subjectPersonId: cmd.subjectPersonId,
              summary: cmd.summary,
            }),
          undoService,
        ),
      inject: [
        InMemoryPersonRepository,
        AuditLoggerService,
        UndoService,
        EmployeeActivityService,
        CreateCaseService,
      ],
    },
    {
      provide: PersonDeactivateUndoExecutor,
      useFactory: (
        personRepository: InMemoryPersonRepository,
        auditLogger: AuditLoggerService,
      ) => new PersonDeactivateUndoExecutor(personRepository, auditLogger),
      inject: [InMemoryPersonRepository, AuditLoggerService],
    },
    {
      provide: TerminateEmployeeService,
      useFactory: (
        personRepository: InMemoryPersonRepository,
        projectAssignmentRepository: InMemoryProjectAssignmentRepository,
        endProjectAssignmentService: EndProjectAssignmentService,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
        employeeActivityService: EmployeeActivityService,
      ) =>
        new TerminateEmployeeService(
          personRepository,
          projectAssignmentRepository,
          endProjectAssignmentService,
          auditLogger,
          notificationEventTranslator,
          // Sprint F-0.4 — wired so TERMINATED activity events fire (was silent).
          employeeActivityService,
        ),
      inject: [
        InMemoryPersonRepository,
        InMemoryProjectAssignmentRepository,
        EndProjectAssignmentService,
        AuditLoggerService,
        NotificationEventTranslatorService,
        EmployeeActivityService,
      ],
    },
    {
      provide: AssignLineManagerService,
      useFactory: (
        personRepository: InMemoryPersonRepository,
        reportingLineRepository: InMemoryReportingLineRepository,
        auditLogger: AuditLoggerService,
      ) => new AssignLineManagerService(personRepository, reportingLineRepository, auditLogger),
      inject: [
        InMemoryPersonRepository,
        InMemoryReportingLineRepository,
        AuditLoggerService,
      ],
    },
    {
      provide: TerminateReportingLineService,
      useFactory: (reportingLineRepository: InMemoryReportingLineRepository) =>
        new TerminateReportingLineService(reportingLineRepository),
      inject: [InMemoryReportingLineRepository],
    },
    {
      provide: OpenPersonReleaseRequestService,
      useFactory: (
        personRepository: InMemoryPersonRepository,
        prisma: PrismaService,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
        responsibilityResolver: ResponsibilityResolverService,
      ) =>
        new OpenPersonReleaseRequestService(
          personRepository,
          prisma,
          auditLogger,
          notificationEventTranslator,
          responsibilityResolver,
        ),
      inject: [
        InMemoryPersonRepository,
        PrismaService,
        AuditLoggerService,
        NotificationEventTranslatorService,
        ResponsibilityResolverService,
      ],
    },
    {
      provide: DecidePersonReleaseService,
      useFactory: (
        prisma: PrismaService,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
        responsibilityResolver: ResponsibilityResolverService,
      ) =>
        new DecidePersonReleaseService(
          prisma,
          auditLogger,
          notificationEventTranslator,
          responsibilityResolver,
        ),
      inject: [
        PrismaService,
        AuditLoggerService,
        NotificationEventTranslatorService,
        ResponsibilityResolverService,
      ],
    },
    EmployeeActivityService,
  ],
  exports: [
    AssignLineManagerService,
    TerminateReportingLineService,
    CreateEmployeeService,
    DeactivateEmployeeService,
    EmployeeActivityService,
    TerminateEmployeeService,
    InMemoryPersonRepository,
    InMemoryOrgUnitRepository,
    InMemoryPersonOrgMembershipRepository,
    InMemoryReportingLineRepository,
    PersonDirectoryQueryService,
    ManagerScopeQueryService,
    OrgChartQueryService,
    TeamQueryService,
    CreateTeamService,
    UpdateTeamMemberService,
  ],
})
export class OrganizationModule {
  // HD-8 / Chunk 8.4a — register the person-deactivate undo executor.
  public constructor(
    registry: UndoActionExecutorRegistry,
    deactivateExecutor: PersonDeactivateUndoExecutor,
  ) {
    registry.register(deactivateExecutor);
  }
}
