import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface ThresholdInput {
  allocationPercent?: number;
  startDate: Date;
  endDate?: Date;
}

interface ThresholdSnapshot {
  allocationPercentMin: number | null;
  durationMonthsMin: number | null;
}

const DEFAULT_ALLOCATION_PERCENT_MIN = 80;
const DEFAULT_DURATION_MONTHS_MIN = 12;

const KEY_ALLOCATION = 'assignment.directorApproval.allocationPercentMin';
const KEY_DURATION = 'assignment.directorApproval.durationMonthsMin';

@Injectable()
export class DirectorApprovalThresholdService {
  public constructor(private readonly prisma: PrismaService) {}

  public async evaluate(input: ThresholdInput): Promise<boolean> {
    const snapshot = await this.loadThresholds();
    const allocationTrips = this.allocationTrips(input.allocationPercent, snapshot);
    const durationTrips = this.durationTrips(input.startDate, input.endDate, snapshot);
    return allocationTrips || durationTrips;
  }

  public async snapshot(): Promise<ThresholdSnapshot> {
    return this.loadThresholds();
  }

  private async loadThresholds(): Promise<ThresholdSnapshot> {
    const rows = await this.prisma.platformSetting.findMany({
      where: { key: { in: [KEY_ALLOCATION, KEY_DURATION] } },
    });
    const map = new Map(rows.map((r: { key: string; value: unknown }) => [r.key, r.value]));
    return {
      allocationPercentMin: this.coerceNullableNumber(map.get(KEY_ALLOCATION), DEFAULT_ALLOCATION_PERCENT_MIN),
      durationMonthsMin: this.coerceNullableNumber(map.get(KEY_DURATION), DEFAULT_DURATION_MONTHS_MIN),
    };
  }

  private allocationTrips(
    allocationPercent: number | undefined,
    snapshot: ThresholdSnapshot,
  ): boolean {
    if (snapshot.allocationPercentMin === null) return false;
    if (allocationPercent === undefined) return false;
    return allocationPercent >= snapshot.allocationPercentMin;
  }

  private durationTrips(
    startDate: Date,
    endDate: Date | undefined,
    snapshot: ThresholdSnapshot,
  ): boolean {
    if (snapshot.durationMonthsMin === null) return false;
    if (!endDate) return false;
    const ms = endDate.getTime() - startDate.getTime();
    if (ms <= 0) return false;
    const months = ms / (1000 * 60 * 60 * 24 * 30.44);
    return months >= snapshot.durationMonthsMin;
  }

  private coerceNullableNumber(value: unknown, fallback: number): number | null {
    if (value === null) return null;
    if (value === undefined) return fallback;
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return fallback;
  }
}
