import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { SetupRun, SetupRunLog } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import type { SetupStepKey } from '../domain/step-keys';
import type {
  AppendLogInput,
  SetupRunsRepositoryPort,
  UpsertStepInput,
} from '../domain/setup-runs.repository.port';

@Injectable()
export class PrismaSetupRunsRepository implements SetupRunsRepositoryPort {
  public constructor(private readonly prisma: PrismaService) {}

  public async findActiveRun(): Promise<{ runId: string; latestStep: SetupStepKey | null } | null> {
    // The wizard uses one run_id at a time. Active = at least one row that
    // is not COMPLETED. Pick the most recent run_id by max(updated_at).
    const row = await this.prisma.setupRun.findFirst({
      where: { status: { not: 'COMPLETED' } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) return null;

    const latest = await this.prisma.setupRun.findFirst({
      where: { runId: row.runId },
      orderBy: { updatedAt: 'desc' },
    });
    return { runId: row.runId, latestStep: (latest?.stepKey ?? null) as SetupStepKey | null };
  }

  public async findLastCompletedRun(): Promise<{ runId: string; completedAt: Date } | null> {
    const row = await this.prisma.setupRun.findFirst({
      where: { stepKey: 'complete', status: 'COMPLETED' },
      orderBy: { finishedAt: 'desc' },
    });
    if (!row || !row.finishedAt) return null;
    return { runId: row.runId, completedAt: row.finishedAt };
  }

  public async listSteps(runId: string): Promise<SetupRun[]> {
    return this.prisma.setupRun.findMany({ where: { runId }, orderBy: { createdAt: 'asc' } });
  }

  public async findStep(runId: string, stepKey: SetupStepKey): Promise<SetupRun | null> {
    return this.prisma.setupRun.findUnique({ where: { runId_stepKey: { runId, stepKey } } });
  }

  public async upsertStep(input: UpsertStepInput): Promise<SetupRun> {
    const data: Prisma.SetupRunUncheckedCreateInput = {
      runId: input.runId,
      stepKey: input.stepKey,
      status: input.status,
      startedAt: input.startedAt ?? null,
      finishedAt: input.finishedAt ?? null,
      errorPayload: (input.errorPayload as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
      actorId: input.actorId ?? null,
      payloadRedacted:
        (input.payloadRedacted as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
    };
    return this.prisma.setupRun.upsert({
      where: { runId_stepKey: { runId: input.runId, stepKey: input.stepKey } },
      create: data,
      update: {
        status: data.status,
        startedAt: data.startedAt,
        finishedAt: data.finishedAt,
        errorPayload: data.errorPayload,
        actorId: data.actorId,
        payloadRedacted: data.payloadRedacted,
      },
    });
  }

  public async appendLog(input: AppendLogInput): Promise<SetupRunLog> {
    // sequence = (max(sequence) for runId) + 1. Pull-then-insert is cheap
    // because every step is sequential per-run; concurrent appends within
    // a run are protected by the advisory lock the SetupService holds.
    const last = await this.prisma.setupRunLog.findFirst({
      where: { runId: input.runId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    const sequence = (last?.sequence ?? 0) + 1;

    return this.prisma.setupRunLog.create({
      data: {
        runId: input.runId,
        stepKey: input.stepKey,
        sequence,
        level: input.level,
        event: input.event,
        payloadRedacted:
          (input.payloadRedacted as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
        durationMs: input.durationMs ?? null,
      },
    });
  }

  public async listLogs(runId: string): Promise<SetupRunLog[]> {
    return this.prisma.setupRunLog.findMany({ where: { runId }, orderBy: { sequence: 'asc' } });
  }

  public async truncateRun(runId?: string): Promise<void> {
    if (runId) {
      await this.prisma.$transaction([
        this.prisma.setupRunLog.deleteMany({ where: { runId } }),
        this.prisma.setupRun.deleteMany({ where: { runId } }),
      ]);
      return;
    }
    await this.truncateAll();
  }

  public async truncateAll(): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.setupRunLog.deleteMany({}),
      this.prisma.setupRun.deleteMany({}),
    ]);
  }
}

