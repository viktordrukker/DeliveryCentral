import { httpGet } from './http-client';

export interface EmployeeActivityEvent {
  actorId: string | null;
  createdAt: string;
  eventType: string;
  id: string;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  personId: string;
  relatedEntityId: string | null;
  summary: string;
}

export async function fetchEmployeeActivity(
  personId: string,
  limit = 50,
): Promise<EmployeeActivityEvent[]> {
  return httpGet<EmployeeActivityEvent[]>(
    `/org/people/${personId}/activity?limit=${limit}`,
  );
}
