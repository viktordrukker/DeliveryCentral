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
import { Button, IconButton, Table, type Column } from '@/components/ds';

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
      <Button
        variant="secondary"
        onClick={() => { void handleExpand(); }}
        style={{
          background: 'var(--color-surface-alt)',
          border: 'none',
          display: 'block',
          fontWeight: 600,
          padding: '12px 16px',
          textAlign: 'left',
          width: '100%',
          borderRadius: 0,
        }}
        type="button"
      >
        Skill-Matched Suggestions {expanded ? '▲' : '▼'}
      </Button>

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
                    <IconButton
                      aria-label="Remove skill"
                      size="sm"
                      onClick={() => handleRemoveSkill(id)}
                      style={{ color: 'var(--color-chart-5)', fontSize: '14px', lineHeight: 1 }}
                    >
                      ×
                    </IconButton>
                  </span>
                );
              })}
              <Button variant="secondary" data-testid="skill-match-search-btn" disabled={loadingMatch} onClick={() => { void handleSearch(); }} style={{ fontSize: '13px', padding: '4px 12px' }} type="button">
                {loadingMatch ? 'Searching…' : 'Find matches'}
              </Button>
            </div>
          ) : null}

          {!loadingMatch && candidates.length === 0 && selectedSkillIds.length > 0 ? (
            <EmptyState
              description="No people with all required skills and available capacity found."
              title="No skill-matched candidates"
            />
          ) : null}

          {candidates.length > 0 ? (
            <div data-testid="skill-match-results">
              <Table
                variant="compact"
                columns={[
                  { key: 'person', title: 'Person', getValue: (c) => c.displayName, render: (c) => c.displayName },
                  { key: 'skills', title: 'Matched Skills', getValue: (c) => c.matchedSkills.join(', '), render: (c) => c.matchedSkills.join(', ') },
                  { key: 'alloc', title: 'Current Allocation', align: 'right', getValue: (c) => c.currentAllocation, render: (c) => (
                    <span style={{
                      color: c.currentAllocation < 50 ? 'var(--color-status-active)' : c.currentAllocation < 80 ? 'var(--color-status-warning)' : 'var(--color-status-danger)',
                      fontWeight: 600,
                    }}>{c.currentAllocation}%</span>
                  ) },
                ] as Column<SkillMatchCandidate>[]}
                rows={candidates}
                getRowKey={(c) => c.personId}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
