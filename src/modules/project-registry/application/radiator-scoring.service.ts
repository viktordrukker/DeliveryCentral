import { BadRequestException, Injectable } from '@nestjs/common';

import { getCached, setCache } from '@src/shared/cache/simple-cache';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  QuadrantScore,
  RadiatorBand,
  RadiatorHistoryEntry,
  RadiatorSnapshotDto,
  SubDimensionScore,
} from './contracts/radiator.dto';
import { CollectedSignal, RadiatorSignalCollectorService } from './radiator-signal-collector.service';
import {
  DEFAULT_RAG_CUTOFFS,
  RadiatorScore,
  RagCutoffs,
  SUB_DIMENSION_KEYS,
  SUB_DIMENSION_QUADRANT,
  SubDimensionKey,
  ThresholdSet,
  capexCompliance,
  changeRequestBurden,
  costPerformanceIndex,
  criticalPathHealth,
  deliverableAcceptance,
  forecastAccuracy,
  keyPersonRisk,
  milestoneAdherence,
  overAllocationRate,
  overallScore,
  overallScoreToBand,
  quadrantScore,
  requirementsStability,
  scopeCreep,
  scoreToBand,
  spendRate,
  staffingFillRate,
  teamMood,
  timelineDeviation,
  velocityTrend,
} from './radiator-scorers';
import { OrgConfigService } from './org-config.service';
import { RadiatorThresholdService } from './radiator-threshold.service';

const PROJECT_CACHE_TTL_MS = 60_000;

type SimpleScorer = (v: number, t: ThresholdSet) => RadiatorScore;

const SCORER_DISPATCH: Partial<Record<SubDimensionKey, SimpleScorer>> = {
  requirementsStability,
  scopeCreep,
  deliverableAcceptance,
  milestoneAdherence,
  criticalPathHealth,
  velocityTrend,
  costPerformanceIndex,
  spendRate,
  capexCompliance,
  staffingFillRate,
  teamMood,
  overAllocationRate,
  keyPersonRisk,
};

const QUADRANTS: QuadrantScore['key'][] = ['scope', 'schedule', 'budget', 'people'];

function startOfIsoWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function quadrantBand(score: number | null, cutoffs: RagCutoffs): RadiatorBand | null {
  if (score === null) return null;
  // Quadrant scores live on 0..25 scale; divide by 6.25 to reach the 0..4 score scale.
  return scoreToBand(score / 6.25, cutoffs);
}

@Injectable()
export class RadiatorScoringService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly signalCollector: RadiatorSignalCollectorService,
    private readonly thresholdService: RadiatorThresholdService,
    private readonly orgConfigService: OrgConfigService,
  ) {}

  private async getCutoffs(): Promise<RagCutoffs> {
    try {
      const cfg = await this.orgConfigService.getConfig();
      return {
        critical: cfg.ragThresholdCritical ?? DEFAULT_RAG_CUTOFFS.critical,
        red: cfg.ragThresholdRed ?? DEFAULT_RAG_CUTOFFS.red,
        amber: cfg.ragThresholdAmber ?? DEFAULT_RAG_CUTOFFS.amber,
      };
    } catch {
      return DEFAULT_RAG_CUTOFFS;
    }
  }

  public async computeRadiator(projectId: string): Promise<RadiatorSnapshotDto> {
    const cacheKey = `radiator:proj:${projectId}`;
    const cached = getCached<RadiatorSnapshotDto>(cacheKey);
    if (cached) return cached;

    const [signals, thresholds, cutoffs] = await Promise.all([
      this.signalCollector.collectForProject(projectId),
      this.thresholdService.getAllThresholds(),
      this.getCutoffs(),
    ]);

    const subScores: Record<SubDimensionKey, { score: number | null; explanation: string }> = {} as Record<
      SubDimensionKey,
      { score: number | null; explanation: string }
    >;

    for (const key of SUB_DIMENSION_KEYS) {
      const sig: CollectedSignal = signals[key];
      if (sig.value === null) {
        subScores[key] = { score: null, explanation: sig.explanation };
        continue;
      }
      const t = thresholds.get(key);
      if (!t) {
        subScores[key] = { score: null, explanation: sig.explanation };
        continue;
      }

      let score: RadiatorScore | null = null;
      if (key === 'changeRequestBurden' && sig.extra?.size !== undefined) {
        score = changeRequestBurden(sig.value, sig.extra.size, t);
      } else if (key === 'timelineDeviation' && sig.extra?.duration !== undefined) {
        score = timelineDeviation(sig.value, sig.extra.duration, t);
      } else if (key === 'forecastAccuracy' && sig.extra?.bac !== undefined) {
        score = forecastAccuracy(sig.value, sig.extra.bac, t);
      } else {
        const scorer = SCORER_DISPATCH[key];
        if (scorer) score = scorer(sig.value, t);
      }

      subScores[key] = { score, explanation: sig.explanation };
    }

    const weekStart = startOfIsoWeek(new Date());
    const snapshot = await this.prisma.projectRagSnapshot.findUnique({
      where: { projectId_weekStarting: { projectId, weekStarting: weekStart } },
      include: { overrides: { orderBy: { createdAt: 'desc' } } },
    });

    const latestOverrides = new Map<
      string,
      { overrideScore: number; reason: string; overriddenByPersonId: string; createdAt: Date }
    >();
    if (snapshot) {
      for (const o of snapshot.overrides) {
        if (!latestOverrides.has(o.subDimensionKey)) {
          latestOverrides.set(o.subDimensionKey, {
            overrideScore: o.overrideScore,
            reason: o.reason,
            overriddenByPersonId: o.overriddenByPersonId,
            createdAt: o.createdAt,
          });
        }
      }
    }

    const quadrants: QuadrantScore[] = QUADRANTS.map((quad) => {
      const keys = SUB_DIMENSION_KEYS.filter((k) => SUB_DIMENSION_QUADRANT[k] === quad);
      const subs: SubDimensionScore[] = keys.map((k) => {
        const auto = subScores[k].score;
        const override = latestOverrides.get(k);
        const effective = override ? override.overrideScore : auto;
        return {
          key: k,
          autoScore: auto,
          overrideScore: override?.overrideScore ?? null,
          effectiveScore: effective,
          reason: override?.reason ?? null,
          overriddenBy: override?.overriddenByPersonId ?? null,
          overriddenAt: override?.createdAt.toISOString() ?? null,
          explanation: subScores[k].explanation,
        };
      });

      const effScores = subs.map((s) =>
        s.effectiveScore === null ? null : (s.effectiveScore as RadiatorScore),
      );
      const qScore = quadrantScore(effScores);
      return {
        key: quad,
        score: qScore,
        band: quadrantBand(qScore, cutoffs),
        subs,
      };
    });

    const overall = overallScore(quadrants.map((q) => q.score));
    const result: RadiatorSnapshotDto = {
      snapshotId: snapshot?.id ?? null,
      projectId,
      weekStarting: weekStart.toISOString().slice(0, 10),
      overallScore: overall,
      overallBand: overallScoreToBand(overall, cutoffs),
      quadrants,
      narrative: snapshot?.narrative ?? null,
      accomplishments: snapshot?.accomplishments ?? null,
      nextSteps: snapshot?.nextSteps ?? null,
      riskSummary: snapshot?.riskSummary ?? null,
      recordedByPersonId: snapshot?.recordedByPersonId ?? null,
      createdAt: snapshot?.createdAt.toISOString() ?? null,
    };

    setCache(cacheKey, result, PROJECT_CACHE_TTL_MS);
    return result;
  }

  public async getHistory(projectId: string, weeks = 12): Promise<RadiatorHistoryEntry[]> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - weeks * 7);

    const [rows, cutoffs] = await Promise.all([
      this.prisma.projectRagSnapshot.findMany({
        where: { projectId, weekStarting: { gte: since } },
        orderBy: { weekStarting: 'asc' },
        select: { weekStarting: true, overallScore: true },
      }),
      this.getCutoffs(),
    ]);

    return rows
      .filter((r): r is { weekStarting: Date; overallScore: number } => r.overallScore !== null)
      .map((r) => ({
        weekStarting: r.weekStarting.toISOString().slice(0, 10),
        overallScore: r.overallScore,
        overallBand: overallScoreToBand(r.overallScore, cutoffs),
      }));
  }

  public async getSnapshotByWeek(
    projectId: string,
    weekStartingStr: string,
  ): Promise<RadiatorSnapshotDto | null> {
    const weekStart = new Date(weekStartingStr);
    if (Number.isNaN(weekStart.getTime())) {
      throw new BadRequestException('invalid weekStarting');
    }

    const [snapshot, cutoffs] = await Promise.all([
      this.prisma.projectRagSnapshot.findUnique({
        where: { projectId_weekStarting: { projectId, weekStarting: weekStart } },
        include: { overrides: { orderBy: { createdAt: 'desc' } } },
      }),
      this.getCutoffs(),
    ]);
    if (!snapshot) return null;

    const latestOverrides = new Map<
      string,
      { overrideScore: number; autoScore: number | null; reason: string; overriddenByPersonId: string; createdAt: Date }
    >();
    for (const o of snapshot.overrides) {
      if (!latestOverrides.has(o.subDimensionKey)) {
        latestOverrides.set(o.subDimensionKey, {
          overrideScore: o.overrideScore,
          autoScore: o.autoScore,
          reason: o.reason,
          overriddenByPersonId: o.overriddenByPersonId,
          createdAt: o.createdAt,
        });
      }
    }

    const quadrantStoredScores: Record<QuadrantScore['key'], number | null> = {
      scope: snapshot.scopeScore,
      schedule: snapshot.scheduleScore,
      budget: snapshot.budgetScore,
      people: snapshot.peopleScore,
    };

    const quadrants: QuadrantScore[] = QUADRANTS.map((quad) => {
      const keys = SUB_DIMENSION_KEYS.filter((k) => SUB_DIMENSION_QUADRANT[k] === quad);
      const subs: SubDimensionScore[] = keys.map((k) => {
        const override = latestOverrides.get(k);
        const auto = override?.autoScore ?? null;
        const effective = override ? override.overrideScore : auto;
        return {
          key: k,
          autoScore: auto,
          overrideScore: override?.overrideScore ?? null,
          effectiveScore: effective,
          reason: override?.reason ?? null,
          overriddenBy: override?.overriddenByPersonId ?? null,
          overriddenAt: override?.createdAt.toISOString() ?? null,
          explanation: 'Historical snapshot (signals not re-computed).',
        };
      });

      const qScore = quadrantStoredScores[quad];
      return {
        key: quad,
        score: qScore,
        band: quadrantBand(qScore, cutoffs),
        subs,
      };
    });

    const overall = snapshot.overallScore ?? overallScore(quadrants.map((q) => q.score));
    return {
      snapshotId: snapshot.id,
      projectId,
      weekStarting: snapshot.weekStarting.toISOString().slice(0, 10),
      overallScore: overall,
      overallBand: overallScoreToBand(overall, cutoffs),
      quadrants,
      narrative: snapshot.narrative,
      accomplishments: snapshot.accomplishments,
      nextSteps: snapshot.nextSteps,
      riskSummary: snapshot.riskSummary,
      recordedByPersonId: snapshot.recordedByPersonId,
      createdAt: snapshot.createdAt.toISOString(),
    };
  }

  public invalidateCache(projectId: string): void {
    setCache(`radiator:proj:${projectId}`, null as unknown as RadiatorSnapshotDto, 0);
  }
}
