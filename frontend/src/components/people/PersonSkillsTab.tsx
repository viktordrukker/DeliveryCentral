import { useCallback, useEffect, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import {
  type PersonSkill,
  type Skill,
  type UpsertPersonSkillItem,
  fetchPersonSkills,
  fetchSkills,
  upsertPersonSkills,
} from '@/lib/api/skills';
import { ORG_DATA_CHANGED_EVENT } from '@/features/org-chart/useOrgChart';

const PROFICIENCY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Beginner', color: '#6b7280' },
  2: { label: 'Intermediate', color: '#2563eb' },
  3: { label: 'Advanced', color: '#16a34a' },
  4: { label: 'Expert', color: '#7c3aed' },
};

interface PersonSkillsTabProps {
  personId: string;
  canEdit: boolean;
}

export function PersonSkillsTab({ personId, canEdit }: PersonSkillsTabProps): JSX.Element {
  const [skills, setSkills] = useState<PersonSkill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<UpsertPersonSkillItem[]>([]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [personSkills, dictionary] = await Promise.all([
        fetchPersonSkills(personId),
        fetchSkills(),
      ]);
      setSkills(personSkills);
      setAllSkills(dictionary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills.');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleStartEdit(): void {
    setEditItems(
      skills.map((s) => ({
        skillId: s.skillId,
        proficiency: s.proficiency,
        certified: s.certified,
      })),
    );
    setSaveError(null);
    setEditing(true);
  }

  function handleAddSkill(skillId: string): void {
    if (!skillId || editItems.some((i) => i.skillId === skillId)) return;
    setEditItems((prev) => [...prev, { skillId, proficiency: 1, certified: false }]);
  }

  function handleRemoveSkill(skillId: string): void {
    setEditItems((prev) => prev.filter((i) => i.skillId !== skillId));
  }

  function handleChangeProficiency(skillId: string, proficiency: number): void {
    setEditItems((prev) =>
      prev.map((i) => (i.skillId === skillId ? { ...i, proficiency } : i)),
    );
  }

  function handleChangeCertified(skillId: string, certified: boolean): void {
    setEditItems((prev) =>
      prev.map((i) => (i.skillId === skillId ? { ...i, certified } : i)),
    );
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await upsertPersonSkills(personId, editItems);
      setSkills(result);
      setEditing(false);
      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save skills.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading skills..." />;
  if (error) return <ErrorState description={error} />;

  if (editing) {
    return (
      <div data-testid="person-skills-edit">
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 500, fontSize: '14px', marginRight: '8px' }}>
            Add skill:
          </label>
          <select
            className="input"
            data-testid="skill-selector"
            onChange={(e) => { handleAddSkill(e.target.value); e.target.value = ''; }}
            style={{ maxWidth: '240px' }}
          >
            <option value="">— select a skill —</option>
            {allSkills
              .filter((s) => !editItems.some((i) => i.skillId === s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.category ? ` (${s.category})` : ''}
                </option>
              ))}
          </select>
        </div>

        {editItems.length === 0 ? (
          <EmptyState description="Add skills using the selector above." title="No skills added" />
        ) : (
          <table className="data-table" style={{ marginBottom: '16px' }}>
            <thead>
              <tr>
                <th>Skill</th>
                <th>Proficiency</th>
                <th>Certified</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {editItems.map((item) => {
                const skill = allSkills.find((s) => s.id === item.skillId);
                return (
                  <tr key={item.skillId}>
                    <td>{skill?.name ?? item.skillId}</td>
                    <td>
                      <select
                        className="input"
                        data-testid={`proficiency-${item.skillId}`}
                        onChange={(e) => handleChangeProficiency(item.skillId, Number(e.target.value))}
                        style={{ maxWidth: '160px' }}
                        value={item.proficiency}
                      >
                        {[1, 2, 3, 4].map((level) => (
                          <option key={level} value={level}>
                            {level} – {PROFICIENCY_LABELS[level]?.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        checked={item.certified}
                        data-testid={`certified-${item.skillId}`}
                        onChange={(e) => handleChangeCertified(item.skillId, e.target.checked)}
                        type="checkbox"
                      />
                    </td>
                    <td>
                      <button
                        className="button button--secondary"
                        onClick={() => handleRemoveSkill(item.skillId)}
                        style={{ fontSize: '12px', padding: '2px 8px' }}
                        type="button"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {saveError ? <ErrorState description={saveError} /> : null}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="button"
            data-testid="save-skills-btn"
            disabled={saving}
            onClick={() => { void handleSave(); }}
            type="button"
          >
            {saving ? 'Saving…' : 'Save Skills'}
          </button>
          <button
            className="button button--secondary"
            disabled={saving}
            onClick={() => setEditing(false)}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="person-skills-view">
      {canEdit ? (
        <div style={{ marginBottom: '12px' }}>
          <button
            className="button button--secondary"
            data-testid="edit-skills-btn"
            onClick={handleStartEdit}
            type="button"
          >
            Edit Skills
          </button>
        </div>
      ) : null}

      {skills.length === 0 ? (
        <EmptyState
          description="No skills have been recorded for this person."
          title="No skills recorded"
        />
      ) : (
        <table className="data-table" data-testid="skills-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Category</th>
              <th>Proficiency</th>
              <th>Certified</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((s) => {
              const prof = PROFICIENCY_LABELS[s.proficiency] ?? { label: String(s.proficiency), color: '#6b7280' };
              return (
                <tr key={s.id}>
                  <td>{s.skillName}</td>
                  <td>{s.skillCategory ?? '—'}</td>
                  <td>
                    <span
                      style={{
                        background: prof.color,
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                      }}
                    >
                      {prof.label}
                    </span>
                  </td>
                  <td>
                    {s.certified ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>Certified</span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
