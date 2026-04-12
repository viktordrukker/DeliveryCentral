import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import {
  fetchPersonSkills,
  fetchSkills,
  upsertPersonSkills,
} from '@/lib/api/skills';
import { PersonSkillsTab } from './PersonSkillsTab';

vi.mock('@/lib/api/skills', () => ({
  fetchPersonSkills: vi.fn(),
  fetchSkills: vi.fn(),
  upsertPersonSkills: vi.fn(),
}));

const mockedFetchPersonSkills = vi.mocked(fetchPersonSkills);
const mockedFetchSkills = vi.mocked(fetchSkills);
const mockedUpsert = vi.mocked(upsertPersonSkills);

const MOCK_SKILL_DICT = [
  { id: 'skill-1', name: 'TypeScript', category: 'Engineering', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'skill-2', name: 'NestJS', category: 'Engineering', createdAt: '2026-01-01T00:00:00Z' },
];

const MOCK_PERSON_SKILLS = [
  {
    id: 'ps-1',
    personId: 'person-1',
    skillId: 'skill-1',
    skillName: 'TypeScript',
    skillCategory: 'Engineering',
    proficiency: 3,
    certified: true,
    updatedAt: '2026-04-01T00:00:00Z',
  },
];

function renderTab(canEdit = true): void {
  render(
    <PersonSkillsTab canEdit={canEdit} personId="person-1" />,
  );
}

describe('PersonSkillsTab', () => {
  beforeEach(() => {
    mockedFetchPersonSkills.mockReset();
    mockedFetchSkills.mockReset();
    mockedUpsert.mockReset();
  });

  it('shows loading then skill list', async () => {
    mockedFetchPersonSkills.mockResolvedValue(MOCK_PERSON_SKILLS);
    mockedFetchSkills.mockResolvedValue(MOCK_SKILL_DICT);

    renderTab();

    expect(await screen.findByTestId('skills-table')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getAllByText('Certified').length).toBeGreaterThan(0);
  });

  it('shows empty state when no skills', async () => {
    mockedFetchPersonSkills.mockResolvedValue([]);
    mockedFetchSkills.mockResolvedValue(MOCK_SKILL_DICT);

    renderTab();

    expect(await screen.findByText('No skills recorded')).toBeInTheDocument();
  });

  it('shows error when load fails', async () => {
    mockedFetchPersonSkills.mockRejectedValue(new Error('API error'));
    mockedFetchSkills.mockRejectedValue(new Error('API error'));

    renderTab();

    expect(await screen.findByText('API error')).toBeInTheDocument();
  });

  it('shows edit button when canEdit=true', async () => {
    mockedFetchPersonSkills.mockResolvedValue(MOCK_PERSON_SKILLS);
    mockedFetchSkills.mockResolvedValue(MOCK_SKILL_DICT);

    renderTab(true);

    expect(await screen.findByTestId('edit-skills-btn')).toBeInTheDocument();
  });

  it('hides edit button when canEdit=false', async () => {
    mockedFetchPersonSkills.mockResolvedValue(MOCK_PERSON_SKILLS);
    mockedFetchSkills.mockResolvedValue(MOCK_SKILL_DICT);

    renderTab(false);

    await screen.findByTestId('skills-table');
    expect(screen.queryByTestId('edit-skills-btn')).toBeNull();
  });

  it('switches to edit mode and saves', async () => {
    mockedFetchPersonSkills.mockResolvedValue(MOCK_PERSON_SKILLS);
    mockedFetchSkills.mockResolvedValue(MOCK_SKILL_DICT);
    mockedUpsert.mockResolvedValue(MOCK_PERSON_SKILLS);

    const user = userEvent.setup();
    renderTab(true);

    await user.click(await screen.findByTestId('edit-skills-btn'));

    expect(screen.getByTestId('person-skills-edit')).toBeInTheDocument();

    await user.click(screen.getByTestId('save-skills-btn'));

    await waitFor(() => {
      expect(mockedUpsert).toHaveBeenCalledWith('person-1', expect.any(Array));
    });

    // Should return to view mode
    await screen.findByTestId('skills-table');
  });
});
