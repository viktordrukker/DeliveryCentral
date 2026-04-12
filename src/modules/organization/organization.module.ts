import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AuditLoggerService } from '../audit-observability/application/audit-logger.service';
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
import { ReportingLinesController } from './presentation/reporting-lines.controller';
import { TeamsController } from './presentation/teams.controller';

@Module({
  imports: [
    forwardRef(() => AssignmentsModule),
    forwardRef(() => ProjectRegistryModule),
    WorkEvidenceModule,
    NotificationsModule,
  ],
  controllers: [
    PersonDirectoryController,
    ManagerScopeController,
    OrgChartController,
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
        auditLogger: AuditLoggerService,
      ) =>
        new CreateEmployeeService(
          personRepository,
          orgUnitRepository,
          personOrgMembershipRepository,
          auditLogger,
        ),
      inject: [
        InMemoryPersonRepository,
        InMemoryOrgUnitRepository,
        InMemoryPersonOrgMembershipRepository,
        AuditLoggerService,
      ],
    },
    {
      provide: DeactivateEmployeeService,
      useFactory: (
        personRepository: InMemoryPersonRepository,
        auditLogger: AuditLoggerService,
      ) => new DeactivateEmployeeService(personRepository, auditLogger),
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
      ) =>
        new TerminateEmployeeService(
          personRepository,
          projectAssignmentRepository,
          endProjectAssignmentService,
          auditLogger,
          notificationEventTranslator,
        ),
      inject: [
        InMemoryPersonRepository,
        InMemoryProjectAssignmentRepository,
        EndProjectAssignmentService,
        AuditLoggerService,
        NotificationEventTranslatorService,
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
  ],
  exports: [
    AssignLineManagerService,
    TerminateReportingLineService,
    CreateEmployeeService,
    DeactivateEmployeeService,
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
export class OrganizationModule {}
