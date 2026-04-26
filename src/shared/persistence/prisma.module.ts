import { Global, Module } from '@nestjs/common';

import { PublicIdModule } from '../../infrastructure/public-id';
import { PrismaReadReplicaService } from './prisma-read-replica.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [PublicIdModule],
  providers: [PrismaService, PrismaReadReplicaService],
  exports: [PrismaService, PrismaReadReplicaService],
})
export class PrismaModule {}
