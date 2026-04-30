import { Button } from '@/components/ds';

interface ViewToggleProps {
  view: 'chart' | 'table';
  onChange: (view: 'chart' | 'table') => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps): JSX.Element {
  return (
    <div style={{ display: 'inline-flex', gap: 0, borderRadius: 'var(--radius-control, 4px)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <Button
        type="button"
        size="sm"
        variant={view === 'chart' ? 'primary' : 'secondary'}
        onClick={() => onChange('chart')}
        style={{ borderRadius: 0, fontSize: 11 }}
      >
        Chart
      </Button>
      <Button
        type="button"
        size="sm"
        variant={view === 'table' ? 'primary' : 'secondary'}
        onClick={() => onChange('table')}
        style={{ borderRadius: 0, fontSize: 11, borderLeft: '1px solid var(--color-border)' }}
      >
        Table
      </Button>
    </div>
  );
}
