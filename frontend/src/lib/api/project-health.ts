import { httpGet } from './http-client';

export interface ProjectHealthDto {
  projectId: string;
  score: number;
  grade: 'green' | 'yellow' | 'red';
  staffingScore: number;
  evidenceScore: number;
  timelineScore: number;
}

export async function fetchProjectHealth(projectId: string): Promise<ProjectHealthDto> {
  return httpGet<ProjectHealthDto>(`/projects/${projectId}/health`);
}
