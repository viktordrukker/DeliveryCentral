import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  PulseDimensionEntry,
  PulseQuadrantKey,
  PulseReportDimensions,
  PulseReportDto,
  UpsertPulseReportDto,
} from './contracts/pulse-report.dto';

const QUADRANTS: PulseQuadrantKey[] = ['scope', 'schedule', 'budget', 'people'];

function startOfIsoWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function emptyDimension(tier: 'A' | 'B' = 'A'): PulseDimensionEntry {
  return { tier, rag: null, narrative: null };
}

function defaultDimensions(defaultTier: 'A' | 'B'): PulseReportDimensions {
  return {
    scope: emptyDimension(defaultTier),
    schedule: emptyDimension(defaultTier),
    budget: emptyDimension(defaultTier),
    people: emptyDimension(defaultTier),
  };
}

function coerceDimensions(value: unknown, defaultTier: 'A' | 'B'): PulseReportDimensions {
  const base = defaultDimensions(defaultTier);
  if (!value || typeof value !== 'object') return base;
  const asObj = value as Record<string, unknown>;
  for (const q of QUADRANTS) {
    const entry = asObj[q];
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const tier: 'A' | 'B' = e.tier === 'B' ? 'B' : 'A';
    const rag =
      e.rag === 'GREEN' || e.rag === 'AMBER' || e.rag === 'RED' || e.rag === 'CRITICAL'
        ? (e.rag as PulseDimensionEntry['rag'])
        : null;
    const narrative =
      typeof e.narrative === 'string' && e.narrative.length > 0 ? (e.narrative as string) : null;
    base[q] = { tier, rag, narrative };
  }
  // Detailed per-sub-dim narratives (v2.1)
  const detailedRaw = asObj.detailed;
  if (detailedRaw && typeof detailedRaw === 'object') {
    const detailed: Record<string, { narrative: string | null }> = {};
    for (const [k, v] of Object.entries(detailedRaw as Record<string, unknown>)) {
      if (v && typeof v === 'object') {
        const narrative = (v as Record<string, unknown>).narrative;
        detailed[k] = {
          narrative: typeof narrative === 'string' && narrative.length > 0 ? narrative : null,
        };
      }
    }
    if (Object.keys(detailed).length > 0) {
      base.detailed = detailed;
    }
  }
  return base;
}

@Injectable()
export class PulseReportService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getCurrent(projectId: string): Promise<PulseReportDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, shape: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const weekStarting = startOfIsoWeek(new Date());
    const row = await this.prisma.pulseReport.findUnique({
      where: { projectId_weekStarting: { projectId, weekStarting } },
    });

    const defaultTier = project.shape === 'SMALL' ? 'A' : 'B';
    if (!row) {
      return {
        id: null,
        projectId,
        weekStarting: weekStarting.toISOString().slice(0, 10),
        dimensions: defaultDimensions(defaultTier),
        overallNarrative: null,
        submittedByPersonId: null,
        submittedAt: null,
        updatedAt: null,
      };
    }

    return this.toDto(row, defaultTier);
  }

  public async upsert(
    projectId: string,
    dto: UpsertPulseReportDto,
    actorPersonId: string | null,
  ): Promise<PulseReportDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, shape: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const weekStarting = dto.weekStarting
      ? new Date(dto.weekStarting)
      : startOfIsoWeek(new Date());

    const defaultTier = project.shape === 'SMALL' ? 'A' : 'B';
    const existing = await this.prisma.pulseReport.findUnique({
      where: { projectId_weekStarting: { projectId, weekStarting } },
    });
    const currentDims = existing
      ? coerceDimensions(existing.dimensions, defaultTier)
      : defaultDimensions(defaultTier);

    const mergedDims: PulseReportDimensions = { ...currentDims };
    for (const q of QUADRANTS) {
      const patch = dto.dimensions?.[q];
      if (!patch) continue;
      mergedDims[q] = {
        tier: patch.tier ?? currentDims[q].tier,
        rag: patch.rag !== undefined ? patch.rag : currentDims[q].rag,
        narrative: patch.narrative !== undefined ? patch.narrative : currentDims[q].narrative,
      };
    }
    // Detailed per-sub-dim narratives (v2.1)
    if (dto.dimensions?.detailed) {
      const nextDetailed: Record<string, { narrative: string | null }> = { ...(currentDims.detailed ?? {}) };
      for (const [k, entry] of Object.entries(dto.dimensions.detailed)) {
        if (entry && typeof entry === 'object') {
          const narrative = entry.narrative ?? null;
          if (narrative === null || narrative.length === 0) {
            delete nextDetailed[k];
          } else {
            nextDetailed[k] = { narrative };
          }
        }
      }
      if (Object.keys(nextDetailed).length > 0) {
        mergedDims.detailed = nextDetailed;
      } else {
        delete mergedDims.detailed;
      }
    }

    const shouldSubmit = Boolean(dto.submit);
    const now = new Date();
    const dimensionsJson = mergedDims as unknown as Prisma.InputJsonValue;
    const row = await this.prisma.pulseReport.upsert({
      where: { projectId_weekStarting: { projectId, weekStarting } },
      create: {
        projectId,
        weekStarting,
        dimensions: dimensionsJson,
        overallNarrative:
          dto.overallNarrative !== undefined ? dto.overallNarrative : existing?.overallNarrative ?? null,
        submittedByPersonId: shouldSubmit ? actorPersonId : null,
        submittedAt: shouldSubmit ? now : null,
      },
      update: {
        dimensions: dimensionsJson,
        ...(dto.overallNarrative !== undefined ? { overallNarrative: dto.overallNarrative } : {}),
        ...(shouldSubmit
          ? { submittedByPersonId: actorPersonId, submittedAt: now }
          : {}),
      },
    });

    return this.toDto(row, defaultTier);
  }

  private toDto(
    row: {
      id: string;
      projectId: string;
      weekStarting: Date;
      dimensions: unknown;
      overallNarrative: string | null;
      submittedByPersonId: string | null;
      submittedAt: Date | null;
      updatedAt: Date;
    },
    defaultTier: 'A' | 'B',
  ): PulseReportDto {
    return {
      id: row.id,
      projectId: row.projectId,
      weekStarting: row.weekStarting.toISOString().slice(0, 10),
      dimensions: coerceDimensions(row.dimensions, defaultTier),
      overallNarrative: row.overallNarrative,
      submittedByPersonId: row.submittedByPersonId,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
