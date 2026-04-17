import { Module } from '@nestjs/common';
import { PlatformSettingsModule } from '@src/modules/platform-settings/platform-settings.module';

import { OvertimePolicyService } from './application/overtime-policy.service';
import { OvertimeResolverService } from './application/overtime-resolver.service';
import { OvertimeSummaryService } from './application/overtime-summary.service';
import { OvertimeController } from './presentation/overtime.controller';

@Module({
  imports: [PlatformSettingsModule],
  controllers: [OvertimeController],
  providers: [
    OvertimePolicyService,
    OvertimeResolverService,
    OvertimeSummaryService,
  ],
  exports: [
    OvertimeResolverService,
    OvertimeSummaryService,
  ],
})
export class OvertimeModule {}
