import { httpDelete, httpGet, httpPost } from './http-client';

export interface PeriodLock {
  id: string;
  periodFrom: string;
  periodTo: string;
  lockedBy: string;
  lockedAt: string;
}

export interface CreatePeriodLockBody {
  from: string;
  to: string;
}

export async function fetchPeriodLocks(): Promise<PeriodLock[]> {
  return httpGet<PeriodLock[]>('/admin/period-locks');
}

export async function createPeriodLock(body: CreatePeriodLockBody): Promise<PeriodLock> {
  return httpPost<PeriodLock, CreatePeriodLockBody>('/admin/period-locks', body);
}

export async function deletePeriodLock(id: string): Promise<void> {
  await httpDelete(`/admin/period-locks/${encodeURIComponent(id)}`);
}
