export interface JiraSyncStatusSnapshot {
  lastProjectSyncAt?: Date;
  lastProjectSyncOutcome?: 'succeeded' | 'failed';
  lastProjectSyncSummary?: string;
}

export class JiraSyncStatusStore {
  private snapshot: JiraSyncStatusSnapshot = {};

  public getSnapshot(): JiraSyncStatusSnapshot {
    return { ...this.snapshot };
  }

  public recordFailure(summary: string, occurredAt: Date = new Date()): void {
    this.snapshot = {
      lastProjectSyncAt: occurredAt,
      lastProjectSyncOutcome: 'failed',
      lastProjectSyncSummary: summary,
    };
  }

  public recordSuccess(summary: string, occurredAt: Date = new Date()): void {
    this.snapshot = {
      lastProjectSyncAt: occurredAt,
      lastProjectSyncOutcome: 'succeeded',
      lastProjectSyncSummary: summary,
    };
  }
}
