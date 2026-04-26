import { BadRequestException, Injectable } from '@nestjs/common';

import { getCached, setCache } from '@src/shared/cache/simple-cache';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ThresholdConfigDto } from './contracts/radiator.dto';
import {
  DEFAULT_THRESHOLDS,
  SUB_DIMENSION_KEYS,
  SubDimensionKey,
  ThresholdDirection,
  ThresholdSet,
} from './radiator-scorers';

const THRESHOLDS_CACHE_KEY = 'radiator:thresholds';
const THRESHOLDS_TTL_MS = 5 * 60_000;

@Injectable()
export class RadiatorThresholdService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getAllThresholds(): Promise<Map<string, ThresholdSet>> {
    const cached = getCached<Map<string, ThresholdSet>>(THRESHOLDS_CACHE_KEY);
    if (cached) return cached;

    const rows = await this.prisma.radiatorThresholdConfig.findMany();
    const map = new Map<string, ThresholdSet>();
    for (const [key, def] of Object.entries(DEFAULT_THRESHOLDS)) {
      map.set(key, def);
    }
    for (const row of rows) {
      map.set(row.subDimensionKey, {
        t4: row.thresholdScore4,
        t3: row.thresholdScore3,
        t2: row.thresholdScore2,
        t1: row.thresholdScore1,
        direction: row.direction as ThresholdDirection,
      });
    }

    setCache(THRESHOLDS_CACHE_KEY, map, THRESHOLDS_TTL_MS);
    return map;
  }

  public async listConfigs(): Promise<ThresholdConfigDto[]> {
    const rows = await this.prisma.radiatorThresholdConfig.findMany();
    const byKey = new Map(rows.map((r) => [r.subDimensionKey, r]));
    return SUB_DIMENSION_KEYS.map((key) => {
      const row = byKey.get(key);
      const def = DEFAULT_THRESHOLDS[key];
      return {
        subDimensionKey: key,
        thresholdScore4: row?.thresholdScore4 ?? def.t4,
        thresholdScore3: row?.thresholdScore3 ?? def.t3,
        thresholdScore2: row?.thresholdScore2 ?? def.t2,
        thresholdScore1: row?.thresholdScore1 ?? def.t1,
        direction: (row?.direction ?? def.direction) as ThresholdDirection,
        isDefault: !row,
      };
    });
  }

  public async upsertConfig(
    key: string,
    data: { t4: number; t3: number; t2: number; t1: number; direction: ThresholdDirection },
    updatedByPersonId: string,
  ): Promise<void> {
    if (!(SUB_DIMENSION_KEYS as readonly string[]).includes(key)) {
      throw new BadRequestException(`Invalid subDimensionKey: ${key}`);
    }

    await this.prisma.radiatorThresholdConfig.upsert({
      where: { subDimensionKey: key },
      create: {
        subDimensionKey: key as SubDimensionKey,
        thresholdScore4: data.t4,
        thresholdScore3: data.t3,
        thresholdScore2: data.t2,
        thresholdScore1: data.t1,
        direction: data.direction,
        updatedByPersonId,
      },
      update: {
        thresholdScore4: data.t4,
        thresholdScore3: data.t3,
        thresholdScore2: data.t2,
        thresholdScore1: data.t1,
        direction: data.direction,
        updatedByPersonId,
      },
    });

    // Invalidate cache; simple-cache has no wildcard delete so per-project caches will expire naturally.
    setCache(THRESHOLDS_CACHE_KEY, null as unknown as Map<string, ThresholdSet>, 0);
  }
}
