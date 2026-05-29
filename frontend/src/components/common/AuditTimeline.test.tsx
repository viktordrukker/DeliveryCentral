import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { AuditTimeline } from './AuditTimeline';
import { type BusinessAuditRecord } from '@/lib/api/business-audit';

describe('AuditTimeline', () => {
  it('shows empty state when no events', () => {
    render(<AuditTimeline events={[]} />);
    expect(screen.getByTestId('audit-timeline-empty')).toBeInTheDocument();
    expect(screen.getByText('No audit events recorded yet.')).toBeInTheDocument();
  });

  it('renders a list of audit events', () => {
    const events: BusinessAuditRecord[] = [
      {
        actionType: 'CREATE',
        actorId: 'actor-1',
        changeSummary: 'Created project Alpha',
        correlationId: null,
        metadata: {},
        occurredAt: new Date().toISOString(),
        targetEntityId: 'proj-1',
        targetEntityType: 'Project',
      },
      {
        actionType: 'UPDATE',
        actorId: 'actor-2',
        changeSummary: null,
        correlationId: null,
        metadata: {},
        occurredAt: new Date(Date.now() - 60_000).toISOString(),
        targetEntityId: 'proj-1',
        targetEntityType: 'Project',
        oldValues: { status: 'DRAFT' },
        newValues: { status: 'ACTIVE' },
      },
    ];

    render(<AuditTimeline events={events} />);

    expect(screen.getByTestId('audit-timeline')).toBeInTheDocument();
    expect(screen.getAllByTestId('audit-timeline-event')).toHaveLength(2);
    expect(screen.getByText('Created project Alpha')).toBeInTheDocument();
  });

  it('humanizes action type labels', () => {
    const events: BusinessAuditRecord[] = [
      {
        actionType: 'ROLE_CHANGE',
        actorId: null,
        changeSummary: null,
        correlationId: null,
        metadata: {},
        occurredAt: new Date().toISOString(),
        targetEntityType: 'Person',
      },
    ];
    render(<AuditTimeline events={events} />);
    expect(screen.getByText('Role Change')).toBeInTheDocument();
  });

  it('shows diff section when old/new values present', async () => {
    const user = userEvent.setup();

    const events: BusinessAuditRecord[] = [
      {
        actionType: 'UPDATE',
        actorId: 'user-1',
        changeSummary: null,
        correlationId: null,
        metadata: {},
        occurredAt: new Date().toISOString(),
        targetEntityType: 'PlatformSetting',
        targetEntityId: 'general.platformName',
        oldValues: { value: 'OldName' },
        newValues: { value: 'NewName' },
      },
    ];

    render(<AuditTimeline events={events} />);

    const showBtn = screen.getByRole('button', { name: /show details/i });
    await user.click(showBtn);

    expect(screen.getByText('"OldName"')).toBeInTheDocument();
    expect(screen.getByText('"NewName"')).toBeInTheDocument();
  });

  it('applies correct color class for CREATE action', () => {
    const events: BusinessAuditRecord[] = [
      {
        actionType: 'CREATE',
        actorId: null,
        changeSummary: null,
        correlationId: null,
        metadata: {},
        occurredAt: new Date().toISOString(),
        targetEntityType: 'Assignment',
      },
    ];
    render(<AuditTimeline events={events} />);
    const icon = document.querySelector('.audit-timeline__icon');
    expect(icon).not.toBeNull();
    // CREATE = accent color (CSS variable)
    expect((icon as HTMLElement).style.backgroundColor).toBe('var(--color-accent)');
  });

  it('B15: renders the compact decision-log grammar when directorDecisionMode is on', () => {
    const events: BusinessAuditRecord[] = [
      {
        actionType: 'APPROVE',
        actorId: 'actor-1',
        actorDisplayName: 'Noah Bennett',
        changeSummary: 'Activation · Orion Treasury',
        correlationId: null,
        metadata: {},
        occurredAt: new Date().toISOString(),
        targetEntityId: 'p-1',
        targetEntityType: 'Project',
      },
    ];
    render(<AuditTimeline events={events} directorDecisionMode />);
    expect(screen.getByTestId('decision-log')).toBeInTheDocument();
    // the full audit-card layout is NOT used in this mode
    expect(screen.queryByTestId('audit-timeline')).not.toBeInTheDocument();
    expect(screen.getByText('Noah Bennett')).toBeInTheDocument();
    expect(screen.getByText(/Activation · Orion Treasury/)).toBeInTheDocument();
  });

  it('B15: default (directorDecisionMode off) keeps the audit-card layout', () => {
    const events: BusinessAuditRecord[] = [
      {
        actionType: 'CREATE',
        actorId: 'actor-1',
        changeSummary: 'Created project Alpha',
        correlationId: null,
        metadata: {},
        occurredAt: new Date().toISOString(),
        targetEntityId: 'proj-1',
        targetEntityType: 'Project',
      },
    ];
    render(<AuditTimeline events={events} />);
    expect(screen.getByTestId('audit-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('decision-log')).not.toBeInTheDocument();
  });
});
