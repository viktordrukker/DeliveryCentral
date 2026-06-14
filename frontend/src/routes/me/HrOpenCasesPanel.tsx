import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SectionCard } from '@/components/common/SectionCard';
import { fetchCases } from '@/lib/api/cases';

interface OpenCaseSubject {
  personId: string;
  name: string;
}

/**
 * #712 — org-wide "People with Open Cases" surfaced on the v2 /me workspace
 * (HR/people-manager roles). The legacy home for this was the HR dashboard's
 * LifecycleTab, which is behind the dashHr flag (OFF on v2) and unreachable.
 * Names come from the case list's BE-enriched subjectPersonName (never a UUID).
 */
export function HrOpenCasesPanel(): JSX.Element | null {
  const [subjects, setSubjects] = useState<OpenCaseSubject[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchCases({})
      .then((r) => {
        if (!active) return;
        const open = r.items
          .filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS')
          .map((c) => ({ personId: c.subjectPersonId, name: c.subjectPersonName ?? c.subjectPersonId }));
        setSubjects(open);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  // Nothing to show (or not yet loaded with results) — render nothing so the
  // tab stays focused on the user's own cases.
  if (!loaded || subjects.length === 0) return null;

  return (
    <SectionCard title={`People with Open Cases (${subjects.length})`} collapsible>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
        {subjects.length} person{subjects.length !== 1 ? 's have' : ' has'} an open case and may need HR attention.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {subjects.slice(0, 20).map((s) => (
          <Link
            key={s.personId}
            to={`/people/${s.personId}`}
            style={{ display: 'inline-block', background: 'var(--color-status-danger)', color: 'var(--color-surface)', borderRadius: 3, padding: '2px 8px', fontSize: 11 }}
          >
            {s.name}
          </Link>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <Link style={{ fontSize: 11, color: 'var(--color-accent)' }} to="/cases">View all cases</Link>
      </div>
    </SectionCard>
  );
}
