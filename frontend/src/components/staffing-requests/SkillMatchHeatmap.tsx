export interface SkillMatchCell {
  candidatePersonId: string;
  skillName: string;
  /**
   * Proficiency match against the request's required level. Conventions:
   *   1.0 → exact match or above
   *   0.6 → close (one step below)
   *   0.0 → missing
   */
  proficiency: number;
}

interface SkillMatchHeatmapProps {
  candidates: { id: string; displayName: string }[];
  skills: string[];
  cells: SkillMatchCell[];
}

function colorFor(p: number): string {
  if (p >= 0.85) return 'var(--color-status-active)';
  if (p >= 0.5) return 'var(--color-status-warning)';
  return 'var(--color-status-danger)';
}

function labelFor(p: number): string {
  if (p >= 0.85) return 'Strong';
  if (p >= 0.5) return 'Partial';
  if (p > 0) return 'Weak';
  return 'Missing';
}

export function SkillMatchHeatmap({
  candidates,
  skills,
  cells,
}: SkillMatchHeatmapProps): JSX.Element {
  if (skills.length === 0 || candidates.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
        No required skills on this request.
      </div>
    );
  }
  const cellMap = new Map<string, number>();
  for (const c of cells) cellMap.set(`${c.candidatePersonId}::${c.skillName}`, c.proficiency);

  return (
    <div
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
      }}
    >
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `140px repeat(${skills.length}, minmax(80px, 1fr))`,
        gap: 2,
        fontSize: 11,
        background: 'var(--color-border)',
        minWidth: `${140 + skills.length * 80 + skills.length * 2}px`,
      }}
    >
      <div
        style={{
          background: 'var(--color-surface-alt)',
          padding: 'var(--space-1)',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
        }}
      >
        Candidate
      </div>
      {skills.map((s) => (
        <div
          key={`hdr-${s}`}
          title={s}
          style={{
            background: 'var(--color-surface-alt)',
            padding: 'var(--space-1)',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {s}
        </div>
      ))}

      {candidates.map((c) => (
        <RowFragment
          key={c.id}
          name={c.displayName}
          skills={skills}
          getProficiency={(s) => cellMap.get(`${c.id}::${s}`) ?? 0}
        />
      ))}
    </div>
    </div>
  );
}

function RowFragment({
  name,
  skills,
  getProficiency,
}: {
  name: string;
  skills: string[];
  getProficiency: (skill: string) => number;
}): JSX.Element {
  return (
    <>
      <div
        style={{
          background: 'var(--color-surface)',
          padding: 'var(--space-1)',
          fontWeight: 500,
          color: 'var(--color-text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {name}
      </div>
      {skills.map((s) => {
        const p = getProficiency(s);
        return (
          <div
            key={`${name}-${s}`}
            title={`${labelFor(p)} match for "${s}"`}
            aria-label={`${labelFor(p)} match for ${s}`}
            style={{
              background: colorFor(p),
              padding: 'var(--space-1)',
              textAlign: 'center',
              color: 'var(--color-on-status, #fff)',
              fontWeight: 600,
              minHeight: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: p === 0 ? 0.45 : 1,
            }}
          >
            {labelFor(p)}
          </div>
        );
      })}
    </>
  );
}
