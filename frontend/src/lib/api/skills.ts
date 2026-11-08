import { httpDelete, httpGet, httpPost, httpPut } from './http-client';

export interface Skill {
  id: string;
  name: string;
  category?: string | null;
  createdAt: string;
}

export interface PersonSkill {
  id: string;
  personId: string;
  skillId: string;
  skillName: string;
  skillCategory?: string | null;
  proficiency: number;
  certified: boolean;
  updatedAt: string;
}

export interface UpsertPersonSkillItem {
  skillId: string;
  proficiency: number;
  certified: boolean;
}

export interface SkillMatchCandidate {
  personId: string;
  displayName: string;
  matchedSkills: string[];
  currentAllocation: number;
}

export async function fetchSkills(): Promise<Skill[]> {
  return httpGet<Skill[]>('/admin/skills');
}

export async function createSkill(name: string, category?: string): Promise<Skill> {
  return httpPost<Skill, { name: string; category?: string }>(
    '/admin/skills',
    { name, category },
  );
}

export async function deleteSkill(id: string): Promise<void> {
  return httpDelete<void>(`/admin/skills/${id}`);
}

export async function fetchPersonSkills(personId: string): Promise<PersonSkill[]> {
  return httpGet<PersonSkill[]>(`/people/${personId}/skills`);
}

export async function upsertPersonSkills(
  personId: string,
  items: UpsertPersonSkillItem[],
): Promise<PersonSkill[]> {
  return httpPut<PersonSkill[], UpsertPersonSkillItem[]>(
    `/people/${personId}/skills`,
    items,
  );
}

export async function fetchSkillMatch(
  skillIds: string[],
  projectId?: string,
): Promise<SkillMatchCandidate[]> {
  const params = new URLSearchParams();
  params.set('skills', skillIds.join(','));
  if (projectId) params.set('projectId', projectId);
  return httpGet<SkillMatchCandidate[]>(`/assignments/skill-match?${params.toString()}`);
}
