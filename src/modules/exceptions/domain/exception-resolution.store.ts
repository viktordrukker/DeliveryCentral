import { Injectable } from '@nestjs/common';

export type ExceptionResolutionStatus = 'RESOLVED' | 'SUPPRESSED';

export interface ExceptionResolutionRecord {
  exceptionId: string;
  resolvedAt: Date;
  resolvedBy: string;
  resolution: string;
  status: ExceptionResolutionStatus;
}

@Injectable()
export class ExceptionResolutionStore {
  private readonly records = new Map<string, ExceptionResolutionRecord>();

  public resolve(
    exceptionId: string,
    resolvedBy: string,
    resolution: string,
  ): ExceptionResolutionRecord {
    const record: ExceptionResolutionRecord = {
      exceptionId,
      resolution,
      resolvedAt: new Date(),
      resolvedBy,
      status: 'RESOLVED',
    };
    this.records.set(exceptionId, record);
    return record;
  }

  public suppress(
    exceptionId: string,
    resolvedBy: string,
    resolution: string,
  ): ExceptionResolutionRecord {
    const record: ExceptionResolutionRecord = {
      exceptionId,
      resolution,
      resolvedAt: new Date(),
      resolvedBy,
      status: 'SUPPRESSED',
    };
    this.records.set(exceptionId, record);
    return record;
  }

  public getById(exceptionId: string): ExceptionResolutionRecord | undefined {
    return this.records.get(exceptionId);
  }

  public isResolved(exceptionId: string): boolean {
    return this.records.has(exceptionId);
  }

  public listAll(): ExceptionResolutionRecord[] {
    return [...this.records.values()];
  }

  public unresolve(exceptionId: string): void {
    this.records.delete(exceptionId);
  }
}
