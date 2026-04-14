import { useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import {
  type SkillMatchCandidate,
  fetchSkillMatch,
  fetchSkills,
  type Skill,
} from '@/lib/api/skills';

interface SkillMatchPanelProps {
  projectId: string;
}

export function SkillMatchPanel({ projectId }: SkillMatchPanelProps): JSX.Element {
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<SkillMatchCandidate[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function handleExpand(): Promise<void> {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (allSkills.length === 0) {
      setLoadingSkills(true);
      try {
        const skills = await fetchSkills();
        setAllSkills(skills);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load skills.');
      } finally {
        setLoadingSkills(false);
      }
    }
  }

  function handleAddSkill(skillId: string): void {
    if (!skillId || selectedSkillIds.includes(skillId)) return;
    setSelectedSkillIds((prev) => [...prev, skillId]);
  }

  function handleRemoveSkill(skillId: string): void {
    setSelectedSkillIds((prev) => prev.filter((id) => id !== skillId));
    setCandidates([]);
  }

  async function handleSearch(): Promise<void> {
    if (selectedSkillIds.length === 0) return;
    setLoadingMatch(true);
    setError(null);
    try {
      const results = await fetchSkillMatch(selectedSkillIds, projectId);
      setCandidates(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find matches.');
    } finally {
      setLoadingMatch(false);
    }
  }

  return (
    <div
      data-testid="skill-match-panel"
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        marginTop: '16px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => { void handleExpand(); }}
        style={{
          background: 'var(--color-surface-alt)',
          border: 'none',
          cursor: 'pointer',
          display: 'block',
          fontWeight: 600,
          padding: '12px 16px',
          textAlign: 'left',
          width: '100%',
        }}
        type="button"
      >
        Skill-Matched Suggestions {expanded ? '▲' : '▼'}
      </button>

      {expanded ? (
        <div style={{ padding: '16px' }}>
          {loadingSkills ? <LoadingState label="Loading skill dictionary..." /> : null}
          {error ? <ErrorState description={error} /> : null}

          {!loadingSkills && allSkills.length > 0 ? (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500, marginRight: '8px' }}>
                Add required skill:
              </label>
              <select
                className="input"
                data-testid="skill-match-selector"
                onChange={(e) => { handleAddSkill(e.target.value); e.target.value = ''; }}
                style={{ maxWidth: '240px' }}
              >
                <option value="">— select skill —</option>
                {allSkills
                  .filter((s) => !selectedSkillIds.includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.category ? ` (${s.category})` : ''}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}

          {selectedSkillIds.length > 0 ? (
            <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Required skills:</span>
              {selectedSkillIds.map((id) => {
                const skill = allSkills.find((s) => s.id === id);
                return (
                  <span
                    key={id}
                    style={{
                      alignItems: 'center',
                      background: '#ede9fe',
                      borderRadius: '12px',
                      color: '#7c3aed',
                      display: 'flex',
                      fontSize: '12px',
                      gap: '4px',
                      padding: '2px 8px',
                    }}
                  >
                    {skill?.name ?? id}
                    <button
                      onClick={() => handleRemoveSkill(id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: '14px', lineHeight: 1 }}
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              <button
                className="button button--secondary"
                data-testid="skill-match-search-btn"
                disabled={loadingMatch}
                onClick={() => { void handleSearch(); }}
                style={{ fontSize: '13px', padding: '4px 12px' }}
                type="button"
              >
                {loadingMatch ? 'Searching…' : 'Find matches'}
              </button>
            </div>
          ) : null}

          {!loadingMatch && candidates.length === 0 && selectedSkillIds.length > 0 ? (
            <EmptyState
              description="No people with all required skills and available capacity found."
              title="No skill-matched candidates"
            />
          ) : null}

          {candidates.length > 0 ? (
            <table className="data-table" data-testid="skill-match-results">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Matched Skills</th>
                  <th>Current Allocation</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.personId}>
                    <td>{c.displayName}</td>
                    <td>{c.matchedSkills.join(', ')}</td>
                    <td>
                      <span
                        style={{
                          color: c.currentAllocation < 50 ? 'var(--color-status-active)' : c.currentAllocation < 80 ? 'var(--color-status-warning)' : 'var(--color-status-danger)',
                          fontWeight: 600,
                        }}
                      >
                        {c.currentAllocation}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
