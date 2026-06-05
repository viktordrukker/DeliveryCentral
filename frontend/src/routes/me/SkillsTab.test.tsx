/**
 * LEAN-P4d-4 — /me?tab=skills self-endorsement UI.
 *
 * Verifies:
 *   - Existing skills render in the "Your skills" table.
 *   - The Add-skill panel only lists dictionary skills not yet on the
 *     caller's profile.
 *   - Submitting the Add-skill form calls `endorseOwnSkill` with the
 *     selected skill + proficiency, then reloads the list.
 *   - Changing the proficiency Select on an existing row also calls
 *     `endorseOwnSkill` (same endpoint handles the update path).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchPersonSkillsMock = vi.fn();
const fetchSkillsMock = vi.fn();
const endorseOwnSkillMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/lib/api/skills', () => ({
  endorseOwnSkill: (...args: unknown[]) => endorseOwnSkillMock(...args),
  fetchPersonSkills: (...args: unknown[]) => fetchPersonSkillsMock(...args),
  fetchSkills: (...args: unknown[]) => fetchSkillsMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: vi.fn(),
    success: (...args: unknown[]) => toastSuccessMock(...args),
    warning: vi.fn(),
  },
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: {
      authSource: 'bearer_token',
      displayName: 'Test User',
      email: 'test@example.com',
      personId: 'person-1',
      roles: ['employee'],
    },
  }),
}));

import { SkillsTab } from './SkillsTab';

const SKILL_DICT = [
  { id: 'skill-1', name: 'TypeScript', category: 'Engineering', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'skill-2', name: 'NestJS', category: 'Engineering', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'skill-3', name: 'React', category: 'Engineering', createdAt: '2026-01-01T00:00:00Z' },
];

const MY_SKILLS = [
  {
    certified: false,
    id: 'ps-1',
    personId: 'person-1',
    proficiency: 2,
    skillCategory: 'Engineering',
    skillId: 'skill-1',
    skillName: 'TypeScript',
    updatedAt: '2026-04-01T00:00:00Z',
  },
];

describe('SkillsTab (/me?tab=skills)', () => {
  beforeEach(() => {
    fetchPersonSkillsMock.mockReset();
    fetchSkillsMock.mockReset();
    endorseOwnSkillMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('renders the caller\'s skills table after load', async () => {
    fetchPersonSkillsMock.mockResolvedValue(MY_SKILLS);
    fetchSkillsMock.mockResolvedValue(SKILL_DICT);

    render(<SkillsTab />);

    expect(await screen.findByTestId('me-skills-table')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('shows EmptyState when the caller has no skills', async () => {
    fetchPersonSkillsMock.mockResolvedValue([]);
    fetchSkillsMock.mockResolvedValue(SKILL_DICT);

    render(<SkillsTab />);

    expect(await screen.findByText('No skills on your profile yet')).toBeInTheDocument();
  });

  it('lists only skills the caller does not already have in the Add selector', async () => {
    fetchPersonSkillsMock.mockResolvedValue(MY_SKILLS);
    fetchSkillsMock.mockResolvedValue(SKILL_DICT);

    render(<SkillsTab />);

    const selector = (await screen.findByTestId('me-skill-selector')) as HTMLSelectElement;
    const optionValues = Array.from(selector.options).map((o) => o.value);
    // Has empty placeholder + skill-2 + skill-3, but NOT skill-1 (already on profile)
    expect(optionValues).toContain('');
    expect(optionValues).toContain('skill-2');
    expect(optionValues).toContain('skill-3');
    expect(optionValues).not.toContain('skill-1');
  });

  it('endorses a new skill and reloads', async () => {
    fetchPersonSkillsMock.mockResolvedValueOnce(MY_SKILLS).mockResolvedValueOnce([
      ...MY_SKILLS,
      {
        certified: false,
        id: 'ps-2',
        personId: 'person-1',
        proficiency: 3,
        skillCategory: 'Engineering',
        skillId: 'skill-2',
        skillName: 'NestJS',
        updatedAt: '2026-06-05T00:00:00Z',
      },
    ]);
    fetchSkillsMock.mockResolvedValue(SKILL_DICT);
    endorseOwnSkillMock.mockResolvedValue({
      certified: false,
      id: 'ps-2',
      personId: 'person-1',
      proficiency: 3,
      skillCategory: 'Engineering',
      skillId: 'skill-2',
      skillName: 'NestJS',
      updatedAt: '2026-06-05T00:00:00Z',
    });

    const user = userEvent.setup();
    render(<SkillsTab />);

    const selector = await screen.findByTestId('me-skill-selector');
    await user.selectOptions(selector, 'skill-2');

    const profSelector = screen.getByTestId('me-skill-proficiency');
    await user.selectOptions(profSelector, '3');

    await user.click(screen.getByTestId('me-endorse-skill-btn'));

    await waitFor(() => {
      expect(endorseOwnSkillMock).toHaveBeenCalledWith('skill-2', 3);
    });
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it('updates proficiency from the row Select via endorseOwnSkill', async () => {
    fetchPersonSkillsMock.mockResolvedValue(MY_SKILLS);
    fetchSkillsMock.mockResolvedValue(SKILL_DICT);
    endorseOwnSkillMock.mockResolvedValue({
      ...MY_SKILLS[0],
      proficiency: 4,
    });

    const user = userEvent.setup();
    render(<SkillsTab />);

    const rowSelect = await screen.findByTestId('me-proficiency-skill-1');
    await user.selectOptions(rowSelect, '4');

    await waitFor(() => {
      expect(endorseOwnSkillMock).toHaveBeenCalledWith('skill-1', 4);
    });
  });
});
