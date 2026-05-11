import { httpGet } from './http-client';

export interface ProjectHealthDto {
  projectId: string;
  score: number;
  grade: 'green' | 'yellow' | 'red';
  staffingScore: number;
  timeScore: number;
  timelineScore: number;
}

export async function fetchProjectHealth(projectId: string): Promise<ProjectHealthDto> {
  return httpGet<ProjectHealthDto>(`/projects/${projectId}/health`);
}

/**
 * Sprint F-0.8 (B-14 / D-88) — batch fetch. Replaces the previous N+1 pattern
 * `Promise.all(items.map(p => fetchProjectHealth(p.id)))` that fired one HTTP
 * request per visible project (30+ on /projects). Backend chunks at 200 ids
 * per call; this client handles arbitrary-length input by chunking too.
 *
 * Returns a Map keyed by projectId. Failed ids are simply absent from the map.
 */
export async function fetchProjectHealthBatch(
  projectIds: string[],
): Promise<Map<string, ProjectHealthDto>> {
  const result = new Map<string, ProjectHealthDto>();
  if (projectIds.length === 0) return result;

  const CHUNK = 200;
  for (let i = 0; i < projectIds.length; i += CHUNK) {
    const slice = projectIds.slice(i, i + CHUNK);
    try {
      const response = await httpGet<Record<string, ProjectHealthDto>>(
        `/projects/health?ids=${encodeURIComponent(slice.join(','))}`,
      );
      for (const [id, health] of Object.entries(response)) {
        result.set(id, health);
      }
    } catch {
      // Best-effort: if a chunk fails, the rest still populate.
    }
  }
  return result;
}
