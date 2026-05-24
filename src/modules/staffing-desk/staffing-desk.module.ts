import { Module } from '@nestjs/common';

import { PlatformSettingsModule } from '@src/modules/platform-settings/platform-settings.module';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { BenchManagementService } from './application/bench-management.service';
import { DemandProfileService } from './application/demand-profile.service';
import { ProjectTimelineService } from './application/project-timeline.service';
import { StaffingDeskService } from './application/staffing-desk.service';
import { SupplyProfileService } from './application/supply-profile.service';
import { TeamBuilderService } from './application/team-builder.service';
import { PlannerScenarioService } from './application/planner-scenario.service';
import { WorkforcePlannerService } from './application/workforce-planner.service';
import { JqlService } from './application/jql/jql.service';
import { JqlController } from './presentation/jql.controller';
import { StaffingDeskController } from './presentation/staffing-desk.controller';

@Module({
  imports: [PlatformSettingsModule],
  controllers: [StaffingDeskController, JqlController],
  providers: [
    {
      provide: StaffingDeskService,
      useFactory: (prisma: PrismaService) => new StaffingDeskService(prisma),
      inject: [PrismaService],
    },
    {
      provide: SupplyProfileService,
      useFactory: (prisma: PrismaService) => new SupplyProfileService(prisma),
      inject: [PrismaService],
    },
    {
      provide: BenchManagementService,
      useFactory: (prisma: PrismaService) => new BenchManagementService(prisma),
      inject: [PrismaService],
    },
    {
      provide: DemandProfileService,
      useFactory: (prisma: PrismaService) => new DemandProfileService(prisma),
      inject: [PrismaService],
    },
    {
      provide: ProjectTimelineService,
      useFactory: (prisma: PrismaService) => new ProjectTimelineService(prisma),
      inject: [PrismaService],
    },
    {
      provide: TeamBuilderService,
      useFactory: (prisma: PrismaService) => new TeamBuilderService(prisma),
      inject: [PrismaService],
    },
    {
      provide: WorkforcePlannerService,
      useFactory: (prisma: PrismaService, settings: PlatformSettingsService) =>
        new WorkforcePlannerService(prisma, settings),
      inject: [PrismaService, PlatformSettingsService],
    },
    {
      provide: PlannerScenarioService,
      useFactory: (prisma: PrismaService) => new PlannerScenarioService(prisma),
      inject: [PrismaService],
    },
    {
      provide: JqlService,
      useFactory: (prisma: PrismaService) => new JqlService(prisma),
      inject: [PrismaService],
    },
  ],
})
export class StaffingDeskModule {}
