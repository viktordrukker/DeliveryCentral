import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WorkflowStages } from './WorkflowStages';

describe('<WorkflowStages>', () => {
  const stages = [
    { key: 'created', label: 'Created', status: 'done' as const },
    { key: 'proposed', label: 'Proposed', status: 'done' as const },
    { key: 'in_review', label: 'In review', status: 'current' as const },
    { key: 'booked', label: 'Booked', status: 'upcoming' as const },
    { key: 'assigned', label: 'Assigned', status: 'upcoming' as const },
  ];

  it('renders one list item per stage with the right label', () => {
    render(<WorkflowStages stages={stages} ariaLabel="Test stages" />);
    expect(screen.getByLabelText('Test stages')).toBeInTheDocument();
    for (const stage of stages) {
      expect(screen.getByText(stage.label)).toBeInTheDocument();
    }
  });

  it('marks the current stage with aria-current="step"', () => {
    render(<WorkflowStages stages={stages} />);
    const items = screen.getAllByRole('listitem');
    const current = items.find((el) => el.getAttribute('aria-current') === 'step');
    expect(current).toBeDefined();
    expect(current?.textContent).toContain('In review');
  });

  it('exposes data-stage-status on each stage for visual styling and tests', () => {
    const { container } = render(<WorkflowStages stages={stages} />);
    const ds = container.querySelectorAll<HTMLElement>('[data-stage-status]');
    expect(ds).toHaveLength(stages.length);
    expect(ds[0].getAttribute('data-stage-status')).toBe('done');
    expect(ds[2].getAttribute('data-stage-status')).toBe('current');
    expect(ds[4].getAttribute('data-stage-status')).toBe('upcoming');
  });

  it('renders without throwing when given an empty stage list', () => {
    render(<WorkflowStages stages={[]} ariaLabel="Empty" />);
    expect(screen.getByLabelText('Empty')).toBeEmptyDOMElement();
  });

  it('handles vertical orientation', () => {
    const { container } = render(
      <WorkflowStages stages={stages} orientation="vertical" />,
    );
    expect(container.querySelector('.ds-workflow-stages--vertical')).toBeTruthy();
  });

  it('renders the description below the label when provided', () => {
    render(
      <WorkflowStages
        stages={[
          { key: 's1', label: 'Pick', description: 'PM/DM picks one candidate', status: 'current' },
        ]}
      />,
    );
    expect(screen.getByText('PM/DM picks one candidate')).toBeInTheDocument();
  });
});
