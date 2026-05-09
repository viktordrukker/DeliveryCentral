import { Global, Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { UndoActionExecutorRegistry } from './application/undo-action-executor.registry';
import { UndoService } from './application/undo.service';
import { UndoController } from './presentation/undo.controller';

// HD-8 / Chunk 8.2 — declared `@Global` so any domain module can
// inject `UndoService` to register undo tokens, and any module that
// needs to register an executor at boot can inject the registry.
@Global()
@Module({
  controllers: [UndoController],
  providers: [
    UndoActionExecutorRegistry,
    {
      provide: UndoService,
      useFactory: (prisma: PrismaService, registry: UndoActionExecutorRegistry) =>
        new UndoService(prisma, registry),
      inject: [PrismaService, UndoActionExecutorRegistry],
    },
  ],
  exports: [UndoService, UndoActionExecutorRegistry],
})
export class UndoModule {}
