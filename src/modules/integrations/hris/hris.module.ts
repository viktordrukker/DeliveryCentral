import { Module } from '@nestjs/common';

import { HrisSyncService } from './application/hris-sync.service';
import { HrisController } from './presentation/hris.controller';

@Module({
  controllers: [HrisController],
  providers: [HrisSyncService],
  exports: [HrisSyncService],
})
export class HrisModule {}
