import { render, screen } from '@testing-library/react';

import type { AssignmentHistoryItem } from '@/lib/api/assignments';
import type { ProjectPositionFillHistory } from '@/lib/api/project-positions';

import { AssignmentHistoryTimeline } from './AssignmentHistoryTimeline';

describe('AssignmentHistoryTimeline (W2-04)', () => {
  it('shows the empty-state when there are no items', () => {
    render(<AssignmentHistoryTimeline items={[]} />);
    expect(screen.getByText('No lifecycle history yet')).toBeInTheDocument();
  });

  it('renders legacy AssignmentHistoryItem rows with snapshots', () => {
    const items: AssignmentHistoryItem[] = [
      {
        id: 'h-legacy',
        changeType: 'STATUS_CHANGED',
        occurredAt: '2026-06-01T10:00:00Z',
        changedByPersonId: 'rm-1',
        changeReason: 'Promoted to engineer',
        previousSnapshot: { status: 'PROPOSED' },
        newSnapshot: { status: 'BOOKED' },
      },
    ];
    render(<AssignmentHistoryTimeline items={items} />);

    expect(screen.getByText('Status Changed')).toBeInTheDocument();
    expect(screen.getByText('Promoted to engineer')).toBeInTheDocument();
    expect(screen.getByText(/status: PROPOSED/)).toBeInTheDocument();
    expect(screen.getByText(/status: BOOKED/)).toBeInTheDocument();
  });

  it('renders lean ProjectPositionFillHistory rows with status / person transitions', () => {
    const items: ProjectPositionFillHistory[] = [
      {
        id: 'h-lean',
        positionId: 'pos-1',
        changeType: 'PROPOSED',
        previousStatus: 'OPEN',
        newStatus: 'PROPOSED',
        previousPersonId: undefined,
        newPersonId: 'p-ada',
        changedByPersonId: 'rm-1',
        changeReason: 'Skill match 92%',
        occurredAt: '2026-06-02T10:00:00Z',
      },
    ];
    render(<AssignmentHistoryTimeline items={items} />);

    expect(screen.getByText('Proposed')).toBeInTheDocument();
    expect(screen.getByText('Skill match 92%')).toBeInTheDocument();
    expect(screen.getByText('OPEN → PROPOSED')).toBeInTheDocument();
    expect(screen.getByText('— → p-ada')).toBeInTheDocument();
  });

  it('omits the transition block when neither status nor person transitions are populated', () => {
    const items: ProjectPositionFillHistory[] = [
      {
        id: 'h-bare',
        positionId: 'pos-1',
        changeType: 'DRAFTED',
        occurredAt: '2026-06-01T10:00:00Z',
      },
    ];
    render(<AssignmentHistoryTimeline items={items} />);

    expect(screen.getByText('Drafted')).toBeInTheDocument();
    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
  });
});
