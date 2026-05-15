import { Injectable, Logger } from '@nestjs/common';

import { PlatformFlagsService } from '@src/shared/config/platform-flags.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-7.4 / D-164 — multi-currency consolidation service.
 *
 * Wraps the `fx_rates` table with two operations:
 *
 *   - `getLatestRate(from, to, asOf?)` — most recent rate at or before
 *     `asOf` (default: today). Returns `1` for same-currency lookups
 *     and `null` when no rate is configured.
 *   - `convert(amount, from, to, asOf?)` — applies the rate to an
 *     amount. Returns `null` when no rate is configured AND the
 *     `flag.feature.financial.multiCurrency.enabled` flag is ON
 *     (strict). When the flag is OFF, falls through to identity
 *     (returns the amount unchanged) so single-currency tenants
 *     experience zero behavioural change.
 *
 * The flag gate is the v1 escape hatch: single-currency banks observe
 * identity conversion regardless of fx_rates state. Multi-currency
 * tenants flip the flag ON and any same-amount conversion missing a
 * rate becomes a hard null (caller-visible) instead of a silent pass-
 * through.
 */
@Injectable()
export class FxRateService {
  private readonly logger = new Logger(FxRateService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly flags: PlatformFlagsService,
  ) {}

  public async getLatestRate(
    fromCurrency: string,
    toCurrency: string,
    asOf: Date = new Date(),
  ): Promise<number | null> {
    if (fromCurrency === toCurrency) return 1;
    try {
      const row = await this.prisma.fxRate.findFirst({
        where: {
          fromCurrency,
          toCurrency,
          asOf: { lte: asOf },
        },
        orderBy: { asOf: 'desc' },
        select: { rate: true },
      });
      if (!row) return null;
      return Number(row.rate);
    } catch (error) {
      this.logger.warn(
        `getLatestRate(${fromCurrency} → ${toCurrency}) failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Convert `amount` from `fromCurrency` to `toCurrency` using the most
   * recent rate at or before `asOf`. Returns the converted amount when
   * a rate is found, `null` when strict (flag ON) and no rate exists,
   * or `amount` unchanged when the flag is OFF (single-currency mode).
   */
  public async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    asOf: Date = new Date(),
  ): Promise<number | null> {
    if (fromCurrency === toCurrency) return amount;
    const rate = await this.getLatestRate(fromCurrency, toCurrency, asOf);
    if (rate !== null) return amount * rate;

    const strict = await this.flags.isEnabled('financialMultiCurrency');
    if (strict) {
      this.logger.warn(
        `convert(${fromCurrency} → ${toCurrency}, asOf=${asOf.toISOString()}) found no rate; returning null (multiCurrency flag ON).`,
      );
      return null;
    }
    // Single-currency tenant: silently identity-convert.
    return amount;
  }
}
