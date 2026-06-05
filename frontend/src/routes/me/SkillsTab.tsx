import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { Button, Select, Table, type Column } from '@/components/ds';
import {
  endorseOwnSkill,
  fetchPersonSkills,
  fetchSkills,
  type PersonSkill,
  type Skill,
} from '@/lib/api/skills';

const PROFICIENCY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Beginner', color: 'var(--color-status-neutral)' },
  2: { label: 'Intermediate', color: 'var(--color-status-info)' },
  3: { label: 'Advanced', color: 'var(--color-status-active)' },
  4: { label: 'Expert', color: 'var(--color-chart-5)' },
};

/**
 * /me?tab=skills — Employee self-endorsement (LEAN-P4d-4).
 *
 * Lists the caller's PersonSkill rows and lets them add a new skill
 * directly (no HR review). The backend marks the resulting row
 * `selfEndorsed=true` so HR can still surface the unverified pool.
 *
 * Editing an existing skill (e.g., bumping proficiency from 2 → 3) is
 * an immediate write; the row's `selfEndorsed` flag is not flipped
 * if it was originally manager-recorded.
 */
export function SkillsTab(): JSX.Element {
  const { principal } = useAuth();
  const personId = principal?.personId ?? '';

  const [mySkills, setMySkills] = useState<PersonSkill[]>([]);
  const [dictionary, setDictionary] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [proficiency, setProficiency] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!personId) return;
    setLoading(true);
    setError(null);
    try {
      const [skills, dict] = await Promise.all([fetchPersonSkills(personId), fetchSkills()]);
      setMySkills(skills);
      setDictionary(dict);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableSkills = dictionary.filter(
    (s) => !mySkills.some((my) => my.skillId === s.id),
  );

  async function handleEndorse(): Promise<void> {
    if (!selectedSkillId) return;
    setSaving(true);
    try {
      await endorseOwnSkill(selectedSkillId, proficiency);
      toast.success('Skill added to your profile');
      setSelectedSkillId('');
      setProficiency(1);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add skill');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateProficiency(skill: PersonSkill, next: number): Promise<void> {
    if (next === skill.proficiency) return;
    setSaving(true);
    try {
      await endorseOwnSkill(skill.skillId, next);
      toast.success('Proficiency updated');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update proficiency');
    } finally {
      setSaving(false);
    }
  }

  if (!principal) return <LoadingState label="Loading…" />;
  if (loading) return <LoadingState label="Loading skills…" />;
  if (error) return <ErrorState description={error} />;

  return (
    <div data-testid="me-skills-tab">
      <SectionCard title="Add a skill">
        <div
          style={{
            alignItems: 'flex-end',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <label className="field" style={{ minWidth: '240px' }}>
            <span className="field__label">Skill</span>
            <Select
              data-testid="me-skill-selector"
              onChange={(e) => setSelectedSkillId(e.target.value)}
              value={selectedSkillId}
            >
              <option value="">— select a skill —</option>
              {availableSkills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.category ? ` (${s.category})` : ''}
                </option>
              ))}
            </Select>
          </label>
          <label className="field" style={{ minWidth: '180px' }}>
            <span className="field__label">Proficiency</span>
            <Select
              data-testid="me-skill-proficiency"
              onChange={(e) => setProficiency(Number(e.target.value))}
              value={proficiency}
            >
              {[1, 2, 3, 4].map((level) => (
                <option key={level} value={level}>
                  {level} – {PROFICIENCY_LABELS[level]?.label}
                </option>
              ))}
            </Select>
          </label>
          <Button
            data-testid="me-endorse-skill-btn"
            disabled={!selectedSkillId || saving}
            onClick={() => {
              void handleEndorse();
            }}
            type="button"
            variant="primary"
          >
            {saving ? 'Saving…' : 'Add skill'}
          </Button>
        </div>
        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '12px',
            marginTop: 'var(--space-2)',
          }}
        >
          Skills you add here go on your profile right away. HR can still review them later.
        </p>
      </SectionCard>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <SectionCard title="Your skills">
          {mySkills.length === 0 ? (
          <EmptyState
            description="Add a skill above to populate your profile."
            title="No skills on your profile yet"
          />
        ) : (
          <div data-testid="me-skills-table">
            <Table
              columns={[
                {
                  key: 'skill',
                  title: 'Skill',
                  getValue: (s) => s.skillName,
                  render: (s) => s.skillName,
                },
                {
                  key: 'category',
                  title: 'Category',
                  getValue: (s) => s.skillCategory ?? '',
                  render: (s) => s.skillCategory ?? '—',
                },
                {
                  key: 'proficiency',
                  title: 'Proficiency',
                  getValue: (s) => s.proficiency,
                  render: (s) => (
                    <Select
                      aria-label={`Proficiency for ${s.skillName}`}
                      data-testid={`me-proficiency-${s.skillId}`}
                      disabled={saving}
                      onChange={(e) => {
                        void handleUpdateProficiency(s, Number(e.target.value));
                      }}
                      value={s.proficiency}
                    >
                      {[1, 2, 3, 4].map((level) => (
                        <option key={level} value={level}>
                          {level} – {PROFICIENCY_LABELS[level]?.label}
                        </option>
                      ))}
                    </Select>
                  ),
                },
                {
                  key: 'certified',
                  title: 'Certified',
                  getValue: (s) => (s.certified ? 1 : 0),
                  render: (s) =>
                    s.certified ? (
                      <span style={{ color: 'var(--color-status-active)', fontWeight: 600 }}>
                        Certified
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    ),
                },
              ] as Column<PersonSkill>[]}
              getRowKey={(s) => s.id}
              rows={mySkills}
              variant="compact"
            />
          </div>
        )}
        </SectionCard>
      </div>
    </div>
  );
}

export default SkillsTab;
