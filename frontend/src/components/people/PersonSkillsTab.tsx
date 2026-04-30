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
import { Button, Select, Table, type Column } from '@/components/ds';

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
          <div style={{ marginBottom: '16px' }}>
            <Table
              variant="compact"
              columns={[
                { key: 'skill', title: 'Skill', getValue: (i) => allSkills.find((s) => s.id === i.skillId)?.name ?? i.skillId, render: (i) => allSkills.find((s) => s.id === i.skillId)?.name ?? i.skillId },
                { key: 'proficiency', title: 'Proficiency', render: (i) => (
                  <Select
                    data-testid={`proficiency-${i.skillId}`}
                    onChange={(e) => handleChangeProficiency(i.skillId, Number(e.target.value))}
                    style={{ maxWidth: '160px' }}
                    value={i.proficiency}
                  >
                    {[1, 2, 3, 4].map((level) => (
                      <option key={level} value={level}>
                        {level} – {PROFICIENCY_LABELS[level]?.label}
                      </option>
                    ))}
                  </Select>
                ) },
                { key: 'certified', title: 'Certified', render: (i) => (
                  <input
                    checked={i.certified}
                    data-testid={`certified-${i.skillId}`}
                    onChange={(e) => handleChangeCertified(i.skillId, e.target.checked)}
                    type="checkbox"
                  />
                ) },
                { key: 'remove', title: 'Remove', render: (i) => (
                  <Button variant="secondary" size="sm" onClick={() => handleRemoveSkill(i.skillId)} type="button">Remove</Button>
                ) },
              ] as Column<UpsertPersonSkillItem>[]}
              rows={editItems}
              getRowKey={(i) => i.skillId}
            />
          </div>
        )}

        {saveError ? <ErrorState description={saveError} /> : null}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="primary" data-testid="save-skills-btn" disabled={saving} onClick={() => { void handleSave(); }} type="button">
            {saving ? 'Saving…' : 'Save Skills'}
          </Button>
          <Button variant="secondary" disabled={saving} onClick={() => setEditing(false)} type="button">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="person-skills-view">
      {canEdit ? (
        <div style={{ marginBottom: '12px' }}>
          <Button variant="secondary" data-testid="edit-skills-btn" onClick={handleStartEdit} type="button">
            Edit Skills
          </Button>
        </div>
      ) : null}

      {skills.length === 0 ? (
        <EmptyState
          description="No skills have been recorded for this person."
          title="No skills recorded"
        />
      ) : (
        <div data-testid="skills-table">
          <Table
            variant="compact"
            columns={[
              { key: 'skill', title: 'Skill', getValue: (s) => s.skillName, render: (s) => s.skillName },
              { key: 'category', title: 'Category', getValue: (s) => s.skillCategory ?? '', render: (s) => s.skillCategory ?? '—' },
              { key: 'proficiency', title: 'Proficiency', getValue: (s) => s.proficiency, render: (s) => {
                const prof = PROFICIENCY_LABELS[s.proficiency] ?? { label: String(s.proficiency), color: 'var(--color-text-muted)' };
                return (
                  <span style={{ background: prof.color, borderRadius: '4px', color: 'var(--color-surface)', fontSize: '11px', fontWeight: 600, padding: '2px 8px' }}>
                    {prof.label}
                  </span>
                );
              } },
              { key: 'certified', title: 'Certified', getValue: (s) => s.certified ? 1 : 0, render: (s) => (
                s.certified ? (
                  <span style={{ color: 'var(--color-status-active)', fontWeight: 600 }}>Certified</span>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                )
              ) },
            ] as Column<PersonSkill>[]}
            rows={skills}
            getRowKey={(s) => s.id}
          />
        </div>
      )}
    </div>
  );
}
