import { Injectable } from '@nestjs/common';

export type EscalationTier = 0 | 1 | 2;

export interface CaseSlaConfig {
  hoursPerType: Record<string, number>;
}

export interface CaseSlaStatus {
  caseId: string;
  deadline: string;
  escalationTier: EscalationTier;
  hoursOverdue: number;
  hoursRemaining: number;
  isOverdue: boolean;
}

const DEFAULT_SLA_HOURS: Record<string, number> = {
  ONBOARDING: 72,
  OFFBOARDING: 48,
  TRANSFER: 96,
  PERFORMANCE: 120,
};

@Injectable()
export class InMemoryCaseSlaService {
  private slaConfig: Record<string, number> = { ...DEFAULT_SLA_HOURS };

  public getSlaHours(caseType: string): number {
    return this.slaConfig[caseType] ?? 72;
  }

  public getSlaConfig(): Record<string, number> {
    return { ...this.slaConfig };
  }

  public updateSlaHours(caseType: string, hours: number): void {
    this.slaConfig[caseType] = hours;
  }

  public computeSlaStatus(caseId: string, caseType: string, openedAt: string): CaseSlaStatus {
    const slaHours = this.getSlaHours(caseType);
    const openedDate = new Date(openedAt);
    const deadlineDate = new Date(openedDate.getTime() + slaHours * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();
    const hoursRemaining = diffMs / (60 * 60 * 1000);
    const hoursOverdue = hoursRemaining < 0 ? Math.abs(hoursRemaining) : 0;
    const isOverdue = hoursRemaining < 0;

    let escalationTier: EscalationTier = 0;
    if (isOverdue) {
      if (hoursOverdue >= 72) {
        escalationTier = 2;
      } else if (hoursOverdue >= 24) {
        escalationTier = 1;
      } else {
        escalationTier = 0;
      }
    }

    return {
      caseId,
      deadline: deadlineDate.toISOString(),
      escalationTier,
      hoursOverdue: Math.round(hoursOverdue * 10) / 10,
      hoursRemaining: Math.round(Math.max(0, hoursRemaining) * 10) / 10,
      isOverdue,
    };
  }
}
