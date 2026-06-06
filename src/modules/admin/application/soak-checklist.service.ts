import { Injectable } from '@nestjs/common';

import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';

/**
 * MANUAL-CLICK-THROUGH-30 — persistence for the V2 soak click-through matrix.
 *
 * Each session holds the QA team's PASS/FAIL/BLOCKED observation per
 * journey x role cell. We back this with a `PlatformSetting` row keyed by
 * `v2Soak.checklist.<sessionId>` so it survives backend restarts without
 * needing a new Prisma model just for transient QA state.
 *
 * Cells whose `expectedOutcome` is `NOT_APPLICABLE` are not stored — the
 * UI shows them as a fixed strikethrough. Only operator observations are
 * persisted.
 */

export type SoakCellObservation = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN';

export interface SoakChecklistCell {
  journeyId: string;
  role: string;
  observation: SoakCellObservation;
  note?: string;
  observedAt: string;
}

export interface SoakChecklistState {
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  cells: SoakChecklistCell[];
}

const KEY_PREFIX = 'v2Soak.checklist.';

const SESSION_ID_REGEX = /^[A-Za-z0-9._-]{1,64}$/;

@Injectable()
export class SoakChecklistService {
  public constructor(private readonly settings: PlatformSettingsService) {}

  public assertSessionId(sessionId: string): void {
    if (!SESSION_ID_REGEX.test(sessionId)) {
      throw new Error(
        `Invalid sessionId "${sessionId}". Must match ${SESSION_ID_REGEX.source}.`,
      );
    }
  }

  public async load(sessionId: string): Promise<SoakChecklistState | null> {
    this.assertSessionId(sessionId);
    const raw = await this.settings.getRawValue(`${KEY_PREFIX}${sessionId}`);
    if (!raw || typeof raw !== 'object') return null;
    return this.coerce(raw, sessionId);
  }

  public async upsert(
    sessionId: string,
    cells: SoakChecklistCell[],
    actorId?: string,
  ): Promise<SoakChecklistState> {
    this.assertSessionId(sessionId);
    const existing = await this.load(sessionId);
    const now = new Date().toISOString();
    const startedAt = existing?.startedAt ?? now;
    const merged: SoakChecklistState = {
      sessionId,
      startedAt,
      updatedAt: now,
      cells: this.dedupe(cells),
    };
    await this.settings.updateKey(
      `${KEY_PREFIX}${sessionId}`,
      merged as unknown,
      actorId,
    );
    return merged;
  }

  public summarise(
    state: SoakChecklistState,
    expected: Record<string, Record<string, string>>,
  ): SoakChecklistSummary {
    let totalGated = 0;
    let pass = 0;
    let fail = 0;
    let blocked = 0;
    let notRun = 0;
    let regressions = 0;

    for (const [journeyId, roles] of Object.entries(expected)) {
      for (const [role, expectation] of Object.entries(roles)) {
        if (expectation === 'NOT_APPLICABLE') continue;
        totalGated += 1;
        const cell = state.cells.find(
          (c) => c.journeyId === journeyId && c.role === role,
        );
        const observed = cell?.observation ?? 'NOT_RUN';

        // FAIL_EXPECTED cells flip the polarity. Observing FAIL means
        // the gate held — count it as a PASS. Observing PASS means a
        // security regression — count it as a regression + a fail.
        if (expectation === 'FAIL_EXPECTED') {
          if (observed === 'FAIL') pass += 1;
          else if (observed === 'PASS') {
            regressions += 1;
            fail += 1;
          } else if (observed === 'BLOCKED') blocked += 1;
          else notRun += 1;
          continue;
        }

        if (observed === 'PASS') pass += 1;
        else if (observed === 'FAIL') fail += 1;
        else if (observed === 'BLOCKED') blocked += 1;
        else notRun += 1;
      }
    }

    return {
      totalGated,
      pass,
      fail,
      blocked,
      notRun,
      regressions,
      cutoverReady: fail === 0 && notRun === 0 && blocked === 0 && regressions === 0,
    };
  }

  private dedupe(cells: SoakChecklistCell[]): SoakChecklistCell[] {
    const map = new Map<string, SoakChecklistCell>();
    for (const cell of cells) {
      map.set(`${cell.journeyId}::${cell.role}`, cell);
    }
    return Array.from(map.values());
  }

  private coerce(raw: unknown, sessionId: string): SoakChecklistState {
    const obj = raw as Partial<SoakChecklistState>;
    const cells = Array.isArray(obj.cells) ? obj.cells : [];
    return {
      sessionId,
      startedAt: obj.startedAt ?? new Date().toISOString(),
      updatedAt: obj.updatedAt ?? new Date().toISOString(),
      cells: cells.filter((c) => typeof c?.journeyId === 'string' && typeof c?.role === 'string'),
    };
  }
}

export interface SoakChecklistSummary {
  totalGated: number;
  pass: number;
  fail: number;
  blocked: number;
  notRun: number;
  regressions: number;
  cutoverReady: boolean;
}
