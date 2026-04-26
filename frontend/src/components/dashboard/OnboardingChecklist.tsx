import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SectionCard } from '@/components/common/SectionCard';
import { fetchPortfolioSummary } from '@/lib/api/portfolio-dashboard';
import { fetchWorkloadDashboardSummary } from '@/lib/api/workload-dashboard';
import { fetchResourcePools } from '@/lib/api/resource-pools';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchStaffingRequests } from '@/lib/api/staffing-requests';

interface ChecklistStep {
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export function OnboardingChecklist(): JSX.Element | null {
  const [steps, setSteps] = useState<ChecklistStep[] | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchResourcePools().catch(() => ({ items: [] })),
      fetchPortfolioSummary().catch(() => ({ totalProjects: 0 })),
      fetchPersonDirectory({ page: 1, pageSize: 1 }).catch(() => ({ items: [], total: 0 })),
      fetchStaffingRequests().catch(() => [] as unknown[]),
    ])
      .then(([pools, portfolio, directory, staffingRequests]) => {
        if (!active) return;

        const poolCount = pools.items.length;
        const projectCount = portfolio.totalProjects;
        const personCount = directory.total ?? directory.items.length;
        const requestCount = Array.isArray(staffingRequests) ? staffingRequests.length : 0;

        setSteps([
          {
            label: 'Create your first Resource Pool',
            description: 'Group people by organization, location, or cost centre.',
            href: '/resource-pools',
            done: poolCount > 0,
          },
          {
            label: 'Add a Project',
            description: 'Register a project so you can assign people to it.',
            href: '/projects/new',
            done: projectCount > 0,
          },
          {
            label: 'Invite People',
            description: 'Add team members who will be staffed on projects.',
            href: '/people',
            done: personCount > 0,
          },
          {
            label: 'File a Staffing Request',
            description: 'Kick off the demand pipeline to get people assigned.',
            href: '/staffing-requests/new',
            done: requestCount > 0,
          },
        ]);
      })
      .catch(() => {
        if (active) setSteps([]);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!steps || steps.length === 0) return null;
  if (steps.every((s) => s.done)) return null;

  const completed = steps.filter((s) => s.done).length;

  return (
    <SectionCard
      title={`Getting started (${completed}/${steps.length})`}
      collapsible
    >
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {steps.map((step, idx) => (
          <li
            key={step.href}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-3)',
              background: step.done ? 'var(--color-surface-alt)' : 'var(--color-surface)',
              borderLeft: `3px solid ${step.done ? 'var(--color-status-active)' : 'var(--color-accent)'}`,
              borderRadius: 4,
              opacity: step.done ? 0.6 : 1,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flex: '0 0 auto',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: step.done ? 'var(--color-status-active)' : 'var(--color-surface-alt)',
                color: step.done ? 'var(--color-surface)' : 'var(--color-text)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                border: `1px solid ${step.done ? 'var(--color-status-active)' : 'var(--color-border)'}`,
              }}
            >
              {step.done ? '\u2713' : idx + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, textDecoration: step.done ? 'line-through' : undefined }}>
                {step.done ? step.label : <Link to={step.href} style={{ color: 'var(--color-accent)' }}>{step.label}</Link>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{step.description}</div>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
